# AI Career & Skill Development Advisor (MVP)

> Minimal working prototype for Phantom Agents Hackathon – Round 1

This is a **web app + Flask API** that analyzes a student's **interests & strengths** and returns **career paths, skills to learn, and curated learning resources**. It includes a simple **learning plan tracker** stored in browser `localStorage`.

It works **offline with a rules-based engine**. If you add your `OPENAI_API_KEY`, it will also produce an **LLM-enhanced action plan**.

---

## ✨ Features
- Form to capture **interests/strengths/goal**
- **Recommendations API** that ranks careers and aggregates skills
- **Curated courses/resources** mapped to skills (JSON dataset)
- **Learning plan** with progress bar (saved locally)
- Optional **LLM enhancement** using OpenAI (if key provided)

---

## 🧱 Tech Stack
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Python **Flask**
- **Data:** JSON files (`data/`)
- **Optional AI:** OpenAI (chat.completions)

---

## ▶️ Local Setup

```bash
git clone <YOUR_REPO_URL> ai-career-skill-advisor
cd ai-career-skill-advisor

# (recommended) create a venv
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Optional: enable LLM enhancement
cp .env.example .env
# edit .env and add your OPENAI_API_KEY

# Run the app
python backend/app.py
# Server runs on http://localhost:8000
```

Open your browser at **http://localhost:8000** and try the flow.

---

## 📁 Folder Structure
```
ai-career-skill-advisor/
│── backend/
│   └── app.py
│── data/
│   ├── careers.json
│   └── courses.json
│── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│── .env.example
│── requirements.txt
│── README.md
```

---

## 🛠️ API
- `POST /api/recommend`
  - **Body (JSON):**
    ```json
    {
      "name": "Saumyaa",
      "goal": "Data Scientist",
      "interests": ["ai", "data", "web"],
      "strengths": ["math", "problem solving"]
    }
    ```
  - **Response (JSON):**
    ```json
    {
      "careers": [{ "name": "Data Scientist", "skills": ["Python", "Statistics", ...] }],
      "skills": ["Python", "Statistics", ...],
      "courses": [{ "title": "Python for Everybody", "provider": "UoM", "url": "...", "skill": "Python" }],
      "plan": [...]  // string (LLM) or structured list (fallback)
    }
    ```

---

## 🧪 Notes
- The dataset is tiny (for hackathon speed). You can expand `data/*.json` anytime.
- If you deploy the Flask server to **Render/Railway/Heroku**, the same frontend will work.
- If you prefer React, you can swap the frontend and still call `/api/recommend`.

---

## 📜 License
MIT – do whatever, just add credit.
