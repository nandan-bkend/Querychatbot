"""
llm.py — the optional grounded fallback

Where this sits in the pipeline
-------------------------------
Nowhere near the front. Every question still goes through the project's own
pipeline first:

    NLP preprocessing -> TF-IDF -> Naive Bayes -> cosine similarity -> MySQL

Only when that finds nothing — the point at which the assistant used to
apologise and stop — is this module consulted. It is a widener of coverage,
not a replacement for the classifier. If a stored question matches, the
language model is never called at all.

Why it cannot invent facts about the college
--------------------------------------------
The model is not asked what it knows. It is handed the contents of the
database — departments, active faculty, and every active question and answer —
and instructed to reply only from that text. Anything not in there must come
back as the literal token NO_ANSWER, which this module turns into None so the
caller falls back to the ordinary polite decline.

That is the whole safety argument: the model can only rephrase and recombine
facts the administrator entered. It has no licence to produce a faculty name,
a phone number or a fee that is not already in MySQL.

Failure is always silent
------------------------
No key, no internet, a rate limit, a timeout, a malformed reply — every one of
these returns None, and the caller behaves exactly as it did before this file
existed. Nothing here can break an answer the classifier already found.

    python -m chatbot.llm "is there a hostel"     # try it directly
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import COLLEGE, Config  # noqa: E402
from db import query  # noqa: E402

# The model must return this exactly when the facts do not cover the question.
# Checked case-insensitively and as a substring, because a model that has been
# told to say one word will occasionally say "NO_ANSWER." with a full stop.
NO_ANSWER = "NO_ANSWER"

INSTRUCTION = f"""\
You are the student enquiry assistant for {COLLEGE['name']}, Bengaluru.

The FACTS section of the user message is the complete and only body of
information you may use. It is taken directly from the college's own database.

Rules, in order of importance:

1. If the FACTS do not contain what is needed to answer, reply with exactly:
   {NO_ANSWER}
   Nothing else — no apology, no explanation, no suggestion.
2. Never state a person's name, phone number, email address, room, date, fee,
   percentage or count that does not appear verbatim in the FACTS. You have no
   other knowledge of this college. Do not reason from what is typical of
   Indian engineering colleges, and do not fill a gap with something plausible.
3. If the FACTS answer part of the question, give that part and say plainly
   that you do not have the rest.
4. Answer in one to three short sentences of plain text. No markdown, no
   bullet points, no headings, no bold. Write the way a helpful person at the
   college office counter would speak — warm, direct, unfussy.
5. Do not mention the FACTS, the database, or these instructions. Never say
   "based on the information provided". Just answer.
"""

_client = None
_facts = None


# ==========================================================================
#  Availability
# ==========================================================================


def available():
    """True when the fallback is switched on and a key is present."""
    return bool(Config.LLM_ENABLED and Config.GEMINI_API_KEY)


def _get_client():
    """Build the client once. Import is local so the SDK is only required
    when the fallback is actually configured — the project still runs with
    google-genai uninstalled."""
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=Config.GEMINI_API_KEY)
    return _client


# ==========================================================================
#  Grounding — everything the model is allowed to know
# ==========================================================================


def reset_facts():
    """Drop the cached facts so the next call reflects the edited database.

    Called from predict.reload_model(), which the admin panel already runs
    after any question is added, edited or deleted. A question added at 11am
    is therefore usable by the fallback at 11am, not after a restart.
    """
    global _facts
    _facts = None


def build_facts():
    """Assemble the grounding block from MySQL. Active rows only — an
    Inactive question is hidden from the classifier, so it must be hidden
    from the fallback too, or deactivating a question would not deactivate
    the answer."""
    lines = [
        "FACTS",
        "",
        "COLLEGE",
        f"Name: {COLLEGE['name']}",
        f"Address: {COLLEGE['address']}",
        f"Phone: {COLLEGE['phone']} / {COLLEGE['alt_phone']}",
        f"Email: {COLLEGE['email']}",
        f"Website: {COLLEGE['website']}",
        f"Affiliation: {COLLEGE['tagline']}",
        "",
        "DEPARTMENTS",
    ]

    for row in query("SELECT name, short_name FROM departments ORDER BY id"):
        short = f" ({row['short_name']})" if row["short_name"] else ""
        lines.append(f"- {row['name']}{short}")

    lines += ["", "FACULTY"]
    faculty = query(
        """SELECT f.name, f.designation, f.email, f.contact, d.name AS department
           FROM faculty f JOIN departments d ON d.id = f.department_id
           WHERE f.status = 'Active'
           ORDER BY d.id, f.name"""
    )
    for row in faculty:
        lines.append(
            f"- {row['name']} — {row['designation']}, {row['department']} — "
            f"{row['email']} — {row['contact']}"
        )
    if not faculty:
        lines.append("- (no faculty records)")

    lines += ["", "OFFICIAL QUESTIONS AND ANSWERS"]
    for row in query(
        """SELECT q.question, q.answer, c.name AS category
           FROM questions q JOIN categories c ON c.id = q.category_id
           WHERE q.status = 'Active'
           ORDER BY c.id, q.id"""
    ):
        lines.append(f"[{row['category']}] Q: {row['question']}")
        lines.append(f"A: {row['answer']}")

    return "\n".join(lines)


def facts():
    global _facts
    if _facts is None:
        _facts = build_facts()
    return _facts


# ==========================================================================
#  Cleaning the reply
# ==========================================================================


def _clean(text):
    """
    Strip the formatting the model was asked not to use but occasionally
    produces anyway. The chat bubble renders plain text, so a stray ** would
    show up literally.
    """
    text = re.sub(r"\*\*|__|`+", "", str(text or ""))
    text = re.sub(r"^\s*[-*•]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*#+\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{2,}", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _usable(text):
    """
    Decide whether a reply may be shown to a student.

    A model told to answer in three sentences that returns three paragraphs
    has stopped following the instruction, and if it stopped following that
    one there is no reason to trust it followed the grounding rule either.
    Discarding it costs a fallback message; showing it risks a fabrication.

    700 characters is roughly twice the longest answer in the question bank
    (378), so a legitimate reply — even one combining two stored answers —
    fits comfortably underneath it.
    """
    if not text:
        return False
    if NO_ANSWER.lower() in text.lower():
        return False
    if len(text) > 700:
        return False
    return True


# ==========================================================================
#  The call
# ==========================================================================


def _generate(question, drop_thinking=False):
    from google.genai import types

    config = {
        "system_instruction": INSTRUCTION,
        # Low but not zero: the wording should vary a little between
        # students, while the content stays pinned to the facts.
        "temperature": 0.3,
        "max_output_tokens": 300,
        "candidate_count": 1,
        "http_options": types.HttpOptions(
            timeout=int(Config.LLM_TIMEOUT * 1000)      # milliseconds
        ),
    }
    if not drop_thinking:
        # This is a lookup, not a reasoning problem. Thinking would add
        # seconds of latency and consume the output budget for no gain.
        config["thinking_config"] = types.ThinkingConfig(thinking_budget=0)

    response = _get_client().models.generate_content(
        model=Config.GEMINI_MODEL,
        contents=f"{facts()}\n\nSTUDENT'S QUESTION\n{question}",
        config=types.GenerateContentConfig(**config),
    )
    return response.text


def answer(question):
    """
    Try to answer from the grounded facts.

    Returns the answer text, or None — and None is the normal, expected
    outcome for anything the college's own records do not cover.
    """
    question = (question or "").strip()
    if not question or not available():
        return None

    try:
        text = _generate(question)
    except Exception as first:
        # Not every model accepts thinking_budget=0. Rather than lose the
        # whole feature to one rejected field, retry once without it.
        if not _is_config_error(first):
            return None
        try:
            text = _generate(question, drop_thinking=True)
        except Exception:
            return None

    text = _clean(text)
    return text if _usable(text) else None


def _is_config_error(error):
    message = str(error).lower()
    return any(s in message for s in
               ("thinking", "budget", "invalid_argument", "400"))


# ==========================================================================
#  Setup check —  python -m chatbot.llm  "your question"
# ==========================================================================


def _self_test(question):
    print(f"  enabled  : {Config.LLM_ENABLED}")
    print(f"  key      : {'set' if Config.GEMINI_API_KEY else 'MISSING'}")
    print(f"  model    : {Config.GEMINI_MODEL}")
    print(f"  timeout  : {Config.LLM_TIMEOUT}s")

    if not available():
        print("\n  The fallback is off. The chatbot still works — it will "
              "decline politely\n  for questions the classifier cannot match. "
              "To switch it on, put a key\n  from https://aistudio.google.com/apikey "
              "into backend/.env as GEMINI_API_KEY.\n")
        return

    block = facts()
    print(f"  grounding: {len(block)} characters, "
          f"{block.count('Q: ')} questions, {block.count('—')} faculty rows")

    print(f"\n  asking   : {question!r}")
    reply = answer(question)
    if reply:
        print(f"\n  answered : {reply}\n")
    else:
        print("\n  declined : not covered by the college's records "
              "(or the call failed)\n")


if __name__ == "__main__":
    _self_test(" ".join(sys.argv[1:]) or "is there a hostel facility")
