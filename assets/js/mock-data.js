/* ==========================================================================
   mock-data.js — Seed dataset for the frontend prototype
   --------------------------------------------------------------------------
   This file stands in for the MySQL database during the frontend demo.
   Every object below mirrors the column layout of the table it will become:

     questions (id, question, answer, category, status, created_at, updated_at)
     faculty   (id, name, department, designation, email, contact,
                photo, status, updated_at)
     admin     (id, name, email)
     activity  (id, action, entity, entity_id, actor, timestamp)

   When the Python + MySQL backend is ready this file is simply not loaded —
   store.js reads the same shapes from the server instead.
   ========================================================================== */

window.MOCK_DATA = {
  /* ---------------------------------------------------------------- college */
  college: {
    name: "SEA College of Engineering and Technology",
    shortName: "SEA",
    tagline: "Affiliated to VTU, Belagavi · Approved by AICTE, New Delhi",
    established: 1998,
    address:
      "Ayappa Nagar, K. R. Puram, Bengaluru – 560 049, Karnataka",
    phone: "080 2973 0618",
    altPhone: "+91 63664 53030",
    email: "seaclgeduinfo@seaedu.ac.in",
    website: "www.seacet.edu.in",
    officeHours: "Monday to Saturday, 9:30 AM – 5:00 PM",
  },

  /* ------------------------------------------------------ demo credentials */
  /* Mock only. Real authentication happens in the Python backend later. */
  credentials: {
    student: { email: "student@seacet.edu.in", password: "student123" },
    admin: { email: "admin@seacet.edu.in", password: "admin123" },
  },

  student: {
    id: "1SA22IS045",
    name: "Suman",
    email: "student@seacet.edu.in",
    department: "Information Science & Engineering",
    semester: "5th Semester",
  },

  admin: {
    id: "ADM001",
    name: "Prof. Anitha Deshpande",
    email: "admin@seacet.edu.in",
    role: "System Administrator",
  },

  /* ------------------------------------------------------------ taxonomies */
  categories: [
    "Departments",
    "Faculty",
    "Timetable",
    "College Information",
    "Contact Information",
    "Facilities",
  ],

  departments: [
    "Information Science & Engineering",
    "Artificial Intelligence & Machine Learning",
    "Artificial Intelligence & Data Science",
    "Computer Science & Engineering",
    "Electronics & Communication Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
  ],

  designations: [
    "Professor & Head",
    "Professor",
    "Associate Professor",
    "Assistant Professor",
  ],

  /* ============================================================= QUESTIONS */
  questions: [
    /* ---- Departments ---- */
    {
      id: "Q001",
      question: "Who is the HOD of the ISE department?",
      answer:
        "The HOD of the ISE department is Dr. Nijaguna, Professor & Head, Information Science & Engineering. The cabin is in Room B-201, on the second floor of Block B. To get in touch, please contact the college office on 080 2973 0618 or seaclgeduinfo@seaedu.ac.in.",
      category: "Departments",
      status: "Active",
      created_at: "2026-01-14",
      updated_at: "2026-07-28",
    },
    {
      id: "Q002",
      question: "Where is the ISE department located?",
      answer:
        "The Information Science & Engineering department is on the second floor of Block B (the Academic Block). The department office is Room B-201, the staff room is B-205, and the ISE laboratories are in rooms B-210 to B-214.",
      category: "Departments",
      status: "Active",
      created_at: "2026-01-14",
      updated_at: "2026-01-14",
    },
    {
      id: "Q003",
      question: "Which departments does the college have?",
      answer:
        "The college offers seven undergraduate engineering branches: Information Science & Engineering (ISE), Computer Science & Engineering (CSE), Artificial Intelligence & Machine Learning (AI&ML), Artificial Intelligence & Data Science (AI&DS), Electronics & Communication Engineering (ECE), Mechanical Engineering and Civil Engineering. All branches are affiliated to VTU, Belagavi.",
      category: "Departments",
      status: "Active",
      created_at: "2026-01-16",
      updated_at: "2026-03-02",
    },
    {
      id: "Q004",
      question: "How many seats are available in the ISE department?",
      answer:
        "The ISE department has an approved intake of 120 seats per academic year, along with 12 lateral entry seats for diploma holders admitted directly into the third semester.",
      category: "Departments",
      status: "Active",
      created_at: "2026-01-20",
      updated_at: "2026-01-20",
    },
    {
      id: "Q005",
      question: "Who is the HOD of the CSE department?",
      answer:
        "Dr. Shobha Krishnamurthy is the Professor & Head of the Computer Science & Engineering department. For any enquiry, please contact the college office on 080 2973 0618 or seaclgeduinfo@seaedu.ac.in.",
      category: "Departments",
      status: "Active",
      created_at: "2026-01-22",
      updated_at: "2026-01-22",
    },

    /* ---- Faculty ---- */
    {
      id: "Q006",
      question: "Who are the faculty members in ISE?",
      answer:
        "The ISE department has 7 faculty members: Dr. Nijaguna (Professor & Head), Dr. Sushma R. Hegde (Professor), Prof. Anand V. Patil (Associate Professor), Dr. Kavitha Raghavan (Associate Professor), Prof. Nithin S. Gowda (Assistant Professor), Prof. Meghana Bhat (Assistant Professor) and Prof. Rakesh Jadhav (Assistant Professor).",
      category: "Faculty",
      status: "Active",
      created_at: "2026-01-18",
      updated_at: "2026-08-04",
    },
    {
      id: "Q007",
      question: "How can I contact the ISE HOD?",
      answer:
        "Room B-201 is open for students between 10:00 AM and 4:00 PM on working days, and you are welcome to walk in. To reach the department beforehand, contact the college office on 080 2973 0618 or seaclgeduinfo@seaedu.ac.in, and your enquiry will be passed on.",
      category: "Faculty",
      status: "Active",
      created_at: "2026-01-18",
      updated_at: "2026-01-18",
    },
    {
      id: "Q008",
      question: "Who is the placement coordinator for ISE?",
      answer:
        "Prof. Anand V. Patil, Associate Professor in ISE, is the departmental placement coordinator. Placement queries are handled at the Training & Placement cell in Block A, Room A-105, or by writing to directorplacements@seaedu.ac.in.",
      category: "Faculty",
      status: "Active",
      created_at: "2026-02-03",
      updated_at: "2026-06-11",
    },
    {
      id: "Q009",
      question: "What are the qualifications of the ISE faculty?",
      answer:
        "All ISE faculty members hold an M.Tech in Computer Science, Information Science or a related discipline. Three faculty members — Dr. Nijaguna, Dr. Sushma R. Hegde and Dr. Kavitha Raghavan — hold Ph.D. degrees from VTU and Bangalore University.",
      category: "Faculty",
      status: "Active",
      created_at: "2026-02-05",
      updated_at: "2026-02-05",
    },
    {
      id: "Q010",
      question: "How are class advisors assigned?",
      answer:
        "Each ISE section is assigned a class advisor at the start of every academic year by the HOD. For the current academic year, Prof. Nithin S. Gowda is the advisor for Section A and Prof. Meghana Bhat is the advisor for Section B. Advisor details are displayed on the department notice board.",
      category: "Faculty",
      status: "Active",
      created_at: "2026-02-10",
      updated_at: "2026-02-10",
    },

    /* ---- Timetable ---- */
    {
      id: "Q011",
      question: "What are the college timings?",
      answer:
        "Regular class hours are 8:30 AM to 4:30 PM, Monday to Friday. Saturdays are working from 8:30 AM to 2:00 PM. The administrative office is open from 9:30 AM to 5:00 PM on all working days.",
      category: "Timetable",
      status: "Active",
      created_at: "2026-01-15",
      updated_at: "2026-07-30",
    },
    {
      id: "Q012",
      question: "When is the lunch break?",
      answer:
        "The lunch break is from 1:00 PM to 1:45 PM. There are also two short breaks — 10:50 AM to 11:05 AM in the forenoon and 3:15 PM to 3:25 PM in the afternoon.",
      category: "Timetable",
      status: "Active",
      created_at: "2026-01-15",
      updated_at: "2026-01-15",
    },
    {
      id: "Q013",
      question: "When do the semester examinations begin?",
      answer:
        "VTU semester end examinations for the odd semester usually begin in the last week of December, and for the even semester in the last week of June. The exact timetable is published on the VTU website and on the college notice board about four weeks in advance.",
      category: "Timetable",
      status: "Active",
      created_at: "2026-01-25",
      updated_at: "2026-05-19",
    },
    {
      id: "Q014",
      question: "What is the class schedule for ISE 5th semester?",
      answer:
        "The ISE 5th semester timetable has six theory hours and one laboratory session per day. Theory subjects include Software Engineering, Database Management Systems, Computer Networks, Automata Theory and a professional elective. Laboratory sessions are held in B-210 and B-212. The printed timetable is available with the class advisor.",
      category: "Timetable",
      status: "Active",
      created_at: "2026-02-14",
      updated_at: "2026-08-01",
    },
    {
      id: "Q015",
      question: "Are Saturdays working days?",
      answer:
        "Yes. Saturdays are working days from 8:30 AM to 2:00 PM and are generally used for laboratory sessions, tutorials and departmental activities. Second Saturdays are holidays.",
      category: "Timetable",
      status: "Active",
      created_at: "2026-02-18",
      updated_at: "2026-02-18",
    },

    /* ---- College Information ---- */
    {
      id: "Q016",
      question: "Which university is the college affiliated to?",
      answer:
        "SEA College of Engineering and Technology is affiliated to Visvesvaraya Technological University (VTU), Belagavi, and is approved by the All India Council for Technical Education (AICTE), New Delhi.",
      category: "College Information",
      status: "Active",
      created_at: "2026-01-12",
      updated_at: "2026-01-12",
    },
    {
      id: "Q017",
      question: "When was the college established?",
      answer:
        "The college was established in 1998 and has completed more than 27 years of technical education. The campus spans 22 acres at K. R. Puram, Bengaluru.",
      category: "College Information",
      status: "Active",
      created_at: "2026-01-12",
      updated_at: "2026-01-12",
    },
    {
      id: "Q018",
      question: "What is the admission process?",
      answer:
        "Admissions to the B.E. programmes are through the Karnataka CET (KCET) and COMEDK UGET entrance examinations, along with a management quota. Candidates must have passed 10+2 with Physics, Mathematics and one of Chemistry, Biology, Electronics or Computer Science. For details visit the admissions office in Block A or call 080 2973 0618.",
      category: "College Information",
      status: "Active",
      created_at: "2026-01-19",
      updated_at: "2026-04-08",
    },
    {
      id: "Q019",
      question: "Is the college accredited?",
      answer:
        "Yes. The institution is accredited by NAAC with an 'A' grade, and the ISE, CSE and ECE programmes are accredited by the National Board of Accreditation (NBA).",
      category: "College Information",
      status: "Active",
      created_at: "2026-01-26",
      updated_at: "2026-01-26",
    },
    {
      id: "Q020",
      question: "What programmes does the college offer?",
      answer:
        "The college offers seven B.E. undergraduate programmes (ISE, CSE, AI&ML, AI&DS, ECE, Mechanical and Civil) and three M.Tech postgraduate programmes in Computer Science & Engineering, VLSI Design & Embedded Systems and Structural Engineering. A Ph.D. research centre is available under VTU in the ISE and ECE departments.",
      category: "College Information",
      status: "Active",
      created_at: "2026-03-06",
      updated_at: "2026-03-06",
    },

    /* ---- Contact Information ---- */
    {
      id: "Q021",
      question: "What are the contact details of the college?",
      answer:
        "SEA College of Engineering and Technology, Ayappa Nagar, K. R. Puram, Bengaluru – 560 049, Karnataka. Phone: 080 2973 0618 or +91 63664 53030. WhatsApp: +91 73539 45999. Email: seaclgeduinfo@seaedu.ac.in. Website: www.seacet.edu.in.",
      category: "Contact Information",
      status: "Active",
      created_at: "2026-01-13",
      updated_at: "2026-07-22",
    },
    {
      id: "Q022",
      question: "What is the email address of the college office?",
      answer:
        "The general enquiry email is seaclgeduinfo@seaedu.ac.in. You can also write to seaclgeduinfo@gmail.com. For placement enquiries the address is directorplacements@seaedu.ac.in.",
      category: "Contact Information",
      status: "Active",
      created_at: "2026-01-13",
      updated_at: "2026-01-13",
    },
    {
      id: "Q023",
      question: "How do I reach the college campus?",
      answer:
        "The campus is at Ayappa Nagar, K. R. Puram, on the eastern side of Bengaluru. It is close to K. R. Puram railway station and the K. R. Puram metro station on the Purple Line, with frequent BMTC services along Old Madras Road. College buses operate on 14 routes across the city.",
      category: "Contact Information",
      status: "Active",
      created_at: "2026-02-21",
      updated_at: "2026-02-21",
    },
    {
      id: "Q024",
      question: "What are the office hours of the administrative section?",
      answer:
        "The administrative office works from 9:30 AM to 5:00 PM, Monday to Saturday, and remains closed on second Saturdays, Sundays and gazetted holidays. Fee counters are open from 10:00 AM to 3:30 PM.",
      category: "Contact Information",
      status: "Active",
      created_at: "2026-02-24",
      updated_at: "2026-02-24",
    },

    /* ---- Facilities ---- */
    {
      id: "Q025",
      question: "Is hostel accommodation available?",
      answer:
        "Yes. Separate hostels are available for boys and girls inside the campus, with a combined capacity of 620 students. Rooms are available on twin and triple sharing basis, with mess, Wi-Fi, reading rooms and 24x7 security. Hostel applications are handled by the hostel warden in Block D.",
      category: "Facilities",
      status: "Active",
      created_at: "2026-02-27",
      updated_at: "2026-06-30",
    },
    {
      id: "Q026",
      question: "What are the library timings?",
      answer:
        "The central library is open from 8:30 AM to 7:00 PM on working days and 8:30 AM to 2:00 PM on Saturdays. It holds over 48,000 volumes, subscribes to IEEE and Springer digital libraries, and has a separate digital reading section with 40 terminals.",
      category: "Facilities",
      status: "Active",
      created_at: "2026-03-04",
      updated_at: "2026-03-04",
    },
    {
      id: "Q027",
      question: "Does the college provide bus transport?",
      answer:
        "Yes. The college operates 18 buses on 14 routes covering Majestic, Whitefield, Marathahalli, Tin Factory, Banaswadi, Hebbal and Hoskote. Transport fees and route details are available at the transport office in Block A, Room A-012.",
      category: "Facilities",
      status: "Active",
      created_at: "2026-03-11",
      updated_at: "2026-03-11",
    },
    {
      id: "Q028",
      question: "What sports facilities are available?",
      answer:
        "The campus has a 400 metre athletics track, cricket and football grounds, basketball and volleyball courts, an indoor badminton hall, a table tennis room and a gymnasium. A qualified physical education director conducts coaching from 6:30 AM and again after 4:30 PM.",
      category: "Facilities",
      status: "Inactive",
      created_at: "2026-03-15",
      updated_at: "2026-07-18",
    },
  ],

  /* =============================================================== FACULTY */
  faculty: [
    {
      id: "F001",
      name: "Dr. Nijaguna",
      department: "Information Science & Engineering",
      designation: "Professor & Head",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-07-28",
    },
    {
      id: "F002",
      name: "Dr. Sushma R. Hegde",
      department: "Information Science & Engineering",
      designation: "Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-06-12",
    },
    {
      id: "F003",
      name: "Prof. Anand V. Patil",
      department: "Information Science & Engineering",
      designation: "Associate Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-08-04",
    },
    {
      id: "F004",
      name: "Dr. Kavitha Raghavan",
      department: "Information Science & Engineering",
      designation: "Associate Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-05-23",
    },
    {
      id: "F005",
      name: "Prof. Nithin S. Gowda",
      department: "Information Science & Engineering",
      designation: "Assistant Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-08-06",
    },
    {
      id: "F006",
      name: "Prof. Meghana Bhat",
      department: "Information Science & Engineering",
      designation: "Assistant Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-07-15",
    },
    {
      id: "F007",
      name: "Prof. Rakesh Jadhav",
      department: "Information Science & Engineering",
      designation: "Assistant Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Inactive",
      updated_at: "2026-04-02",
    },
    {
      id: "F015",
      name: "Dr. Manjunath H. R.",
      department: "Artificial Intelligence & Machine Learning",
      designation: "Professor & Head",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-07-02",
    },
    {
      id: "F016",
      name: "Prof. Shruthi Prasad",
      department: "Artificial Intelligence & Machine Learning",
      designation: "Assistant Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-05-14",
    },
    {
      id: "F017",
      name: "Dr. Vidyashree K. N.",
      department: "Artificial Intelligence & Data Science",
      designation: "Professor & Head",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-06-19",
    },
    {
      id: "F018",
      name: "Prof. Karthik Rao",
      department: "Artificial Intelligence & Data Science",
      designation: "Assistant Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-04-25",
    },
    {
      id: "F008",
      name: "Dr. Shobha Krishnamurthy",
      department: "Computer Science & Engineering",
      designation: "Professor & Head",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-06-28",
    },
    {
      id: "F009",
      name: "Prof. Vinay Chandra M",
      department: "Computer Science & Engineering",
      designation: "Associate Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-03-19",
    },
    {
      id: "F010",
      name: "Dr. Prakash Sthavarmath",
      department: "Electronics & Communication Engineering",
      designation: "Professor & Head",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-05-08",
    },
    {
      id: "F011",
      name: "Prof. Divya Suresh",
      department: "Electronics & Communication Engineering",
      designation: "Assistant Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-07-09",
    },
    {
      id: "F012",
      name: "Dr. Girish Malnad",
      department: "Mechanical Engineering",
      designation: "Professor & Head",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-02-26",
    },
    {
      id: "F013",
      name: "Prof. Harish Kumar B",
      department: "Mechanical Engineering",
      designation: "Assistant Professor",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-04-17",
    },
    {
      id: "F014",
      name: "Dr. Latha Narayan",
      department: "Civil Engineering",
      designation: "Professor & Head",
      email: "seaclgeduinfo@seaedu.ac.in",
      contact: "080 2973 0618",
      photo: "",
      status: "Active",
      updated_at: "2026-06-05",
    },
  ],

  /* ============================================================== ACTIVITY */
  activity: [
    {
      id: "A001",
      action: "updated",
      entity: "faculty",
      entity_id: "F005",
      label: "Prof. Nithin S. Gowda",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-08-06T11:24:00",
    },
    {
      id: "A002",
      action: "updated",
      entity: "faculty",
      entity_id: "F003",
      label: "Prof. Anand V. Patil",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-08-04T16:02:00",
    },
    {
      id: "A003",
      action: "updated",
      entity: "question",
      entity_id: "Q006",
      label: "Who are the faculty members in ISE?",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-08-04T15:47:00",
    },
    {
      id: "A004",
      action: "updated",
      entity: "question",
      entity_id: "Q014",
      label: "What is the class schedule for ISE 5th semester?",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-08-01T10:12:00",
    },
    {
      id: "A005",
      action: "updated",
      entity: "question",
      entity_id: "Q011",
      label: "What are the college timings?",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-07-30T09:38:00",
    },
    {
      id: "A006",
      action: "updated",
      entity: "question",
      entity_id: "Q001",
      label: "Who is the HOD of the ISE department?",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-07-28T14:55:00",
    },
    {
      id: "A007",
      action: "updated",
      entity: "faculty",
      entity_id: "F001",
      label: "Dr. Nijaguna",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-07-28T14:50:00",
    },
    {
      id: "A008",
      action: "updated",
      entity: "question",
      entity_id: "Q021",
      label: "What are the contact details of the college?",
      actor: "Prof. Anitha Deshpande",
      timestamp: "2026-07-22T12:19:00",
    },
  ],
};
