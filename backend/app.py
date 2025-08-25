import os, json
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'data'))

app = Flask(__name__, static_folder=FRONTEND_DIR, template_folder=FRONTEND_DIR)

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

CAREERS = load_json('careers.json')
COURSES = load_json('courses.json')

def llm_enhance(profile, rec):
    """Optional: if OPENAI_API_KEY is set, try to enhance the plan using OpenAI.
       Falls back silently if not configured or errors occur.
    """
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    try:
        # OpenAI SDK v1.x
        from openai import OpenAI
        client = OpenAI(api_key=key)
        prompt = (
            "You are a career advisor. Given the student's profile and the draft "
            "recommendations, return a short, numbered 4-step actionable plan "
            "with concrete next actions and timelines. Keep it under 120 words."
        )
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({"profile": profile, "draft": rec})},
        ]
        resp = client.chat.completions.create(model="gpt-4o-mini", messages=messages, temperature=0.2)
        return resp.choices[0].message.content.strip()
    except Exception as e:
        # In hackathon settings, we don't fail the whole request if LLM isn't available
        return None

@app.route('/')
def root():
    return send_from_directory(app.template_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

@app.post('/api/recommend')
def recommend():
    data = request.get_json(force=True) or {}
    interests = [x.strip().lower() for x in data.get('interests', []) if x]
    strengths = [x.strip().lower() for x in data.get('strengths', []) if x]
    goal = (data.get('goal') or '').strip().lower()

    # Score careers by interest/strength tag matches
    scored = []
    for c in CAREERS:
        score = 0
        score += sum(tag.lower() in interests for tag in c.get('tags', []))
        score += sum(s.lower() in strengths for s in c.get('strengths', []))
        if goal and goal in c['name'].lower():
            score += 1
        scored.append((score, c))

    # Sort and pick top 5 (or all if fewer)
    scored.sort(key=lambda t: t[0], reverse=True)
    top = [c for s, c in scored if s > 0][:5] or [c for _, c in scored[:5]]

    # Aggregate skills from top careers
    skills = []
    seen = set()
    for c in top:
        for sk in c.get('skills', []):
            if sk not in seen:
                seen.add(sk)
                skills.append(sk)

    # Recommend up to 2 courses per skill if available
    rec_courses = []
    for sk in skills:
        for course in COURSES.get(sk, [])[:2]:
            out = dict(course)
            out['skill'] = sk
            rec_courses.append(out)

    # Simple learning plan (fallback if no LLM)
    draft_plan = [
        {"step": 1, "title": f"Learn {skills[0] if skills else 'core CS basics'}", "items": [c['title'] for c in rec_courses[:3]]},
        {"step": 2, "title": "Build a mini‑project", "items": ["Choose a small problem in your interest area", "Implement and publish on GitHub"]},
        {"step": 3, "title": "Create a portfolio", "items": ["Add README + screenshots", "Write a short blog/README about what you learned"]},
        {"step": 4, "title": "Apply & network", "items": ["Shortlist 5 internships", "Reach out to 3 mentors/alumni"]},
    ]

    enhanced = llm_enhance(
        {"interests": interests, "strengths": strengths, "goal": goal},
        {"careers": [c['name'] for c in top], "skills": skills, "courses": rec_courses}
    )

    return jsonify({
        "careers": top,
        "skills": skills,
        "courses": rec_courses,
        "plan": enhanced or draft_plan
    })

if __name__ == '__main__':
    # Enable debug reload for local development
    app.run(host='0.0.0.0', port=8000, debug=True)
