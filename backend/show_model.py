"""
show_model.py — open the trained model and show what is inside it

Written to be run in front of someone who has asked to see the model. The
saved model is a binary .joblib file, so opening it in an editor shows
nothing readable; this loads it and prints what it actually contains, then
runs one question through the pipeline a stage at a time.

    python show_model.py
    python show_model.py "when does the college open"
"""

import sys
from pathlib import Path

import joblib
from sklearn.metrics.pairwise import cosine_similarity

from config import Config
from chatbot.preprocess import preprocess, content_stems

MODEL_FILE = Config.MODEL_DIR / "chatbot_model.joblib"

RULE = "=" * 68


def heading(n, text):
    print(f"\n{RULE}\n  {n}. {text}\n{RULE}")


def main(question):
    if not MODEL_FILE.exists():
        sys.exit(f"No model at {MODEL_FILE}\nBuild it with: python -m chatbot.train")

    model = joblib.load(MODEL_FILE)
    vec, clf = model["vectorizer"], model["classifier"]

    # ---------------------------------------------------------------- 1
    heading(1, "THE TRAINED MODEL FILE")
    print(f"  path         {MODEL_FILE.relative_to(Config.PROJECT_ROOT)}")
    print(f"  size         {MODEL_FILE.stat().st_size / 1024:.0f} KB")
    print(f"  trained on   {model['training_size']} question phrasings")
    print()
    print("  It holds four things, all built by scikit-learn during training:")
    print(f"    vectorizer     {type(vec).__name__:20s} {len(vec.vocabulary_)} stems learned")
    print(f"    classifier     {type(clf).__name__:20s} {len(clf.classes_)} categories learned")
    print(f"    phrase_matrix  {type(model['phrase_matrix']).__name__:20s} "
          f"{model['phrase_matrix'].shape[0]} x {model['phrase_matrix'].shape[1]}")
    print(f"    questions      {'list':20s} {len(model['questions'])} answerable questions")

    # ---------------------------------------------------------------- 2
    heading(2, "WHAT THE MODEL LEARNED")
    print("  Naive Bayes learned which words predict which category.")
    print("  The strongest word for each, straight out of the trained model:\n")
    names = vec.get_feature_names_out()
    for i, category in enumerate(clf.classes_):
        top = clf.feature_log_prob_[i].argsort()[-4:][::-1]
        print(f"    {category:22s} {', '.join(names[j] for j in top)}")

    # ---------------------------------------------------------------- 3
    heading(3, f"ONE QUESTION, STAGE BY STAGE")
    print(f'  Student types:  "{question}"\n')

    stems = preprocess(question)
    print(f"  1  NLP preprocessing")
    print(f"     tokenise, remove stopwords, Porter stem")
    print(f"     -> {stems!r}\n")

    vector = vec.transform([stems])
    active = [(names[j], vector[0, j]) for j in vector.nonzero()[1]]
    print(f"  2  TF-IDF")
    print(f"     {vector.shape[1]} features in the vocabulary, "
          f"{len(active)} present in this question")
    for name, weight in sorted(active, key=lambda x: -x[1]):
        print(f"     {name:18s} weight {weight:.3f}")

    probs = clf.predict_proba(vector)[0]
    print(f"\n  3  Naive Bayes — probability for every category")
    for category, p in sorted(zip(clf.classes_, probs), key=lambda x: -x[1]):
        bar = "#" * int(p * 40)
        print(f"     {category:22s} {p:6.1%}  {bar}")
    print(f"\n     chosen: {clf.classes_[probs.argmax()]}")

    sims = cosine_similarity(vector, model["phrase_matrix"])[0]
    by_id = {q["id"]: q for q in model["questions"]}
    ranked = sorted(zip(model["phrase_question_ids"], sims),
                    key=lambda x: -x[1])
    print(f"\n  4  Cosine similarity — closest stored question")
    seen = set()
    for qid, score in ranked:
        if int(qid) in seen:
            continue
        seen.add(int(qid))
        q = by_id.get(int(qid))
        if q:
            print(f"     {score:.2f}  {q['question'][:52]}")
        if len(seen) == 3:
            break

    # The scores above are across every question. The real pipeline searches
    # inside the predicted category first and only widens if that fails, so
    # finish by showing what the application actually returns.
    from chatbot import predict
    result = predict.ask(question, log=False)
    print(f"\n  5  What the application actually replies")
    print(f"     category   {result['category']} "
          f"({result['confidence']:.0%} confident)")
    print(f"     matched    {result['matched']}  "
          f"(similarity {result['similarity']:.2f}, via {result['source']})")
    print(f"\n     \"{result['answer'][:160]}\"")

    print(f"\n{RULE}")
    print("  Nothing above is hard-coded. The vocabulary, the probabilities")
    print("  and the similarity scores were all produced by training on")
    print("  data/training_data.csv — change that file, retrain, and every")
    print("  number on this screen changes with it.")
    print(RULE)


if __name__ == "__main__":
    main(" ".join(sys.argv[1:]) or "when does the college open in the morning")
