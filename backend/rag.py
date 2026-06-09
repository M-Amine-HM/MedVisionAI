import os
import json
from pathlib import Path
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
# from langchain_core.prompts import ChatPromptTemplate
# from langchain_groq import ChatGroq
from openai import OpenAI
from langchain_huggingface import HuggingFaceEmbeddings

# --- Configuration ---
BASE_DIR = Path(__file__).resolve().parent
DOCS_DIR = BASE_DIR / "medical_docs"
CLASS_NAMES = ["COVID19", "Normal", "Pneumonia", "Tuberculosis"]

# --- Load Documents ---


def load_medical_docs():
    docs = []
    for class_name in CLASS_NAMES:
        file_path = DOCS_DIR / f"{class_name.lower().replace(' ', '_')}.txt"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
                # Clean special characters
                text = (
                    text.replace("\u2265", ">=")
                        .replace("\u2264", "<=")
                        .replace("\u2192", "->")
                        .replace("\u2082", "2")
                        .replace("\u00b0", " degrees")
                        .replace("\u2013", "-")
                        .replace("\u2014", "-")
                        .replace("\u201c", '"')
                        .replace("\u201d", '"')
                        .replace("\u2019", "'")
                        .replace("\u2022", "-")
                )
                docs.append(Document(
                    page_content=text,
                    metadata={"class": class_name}
                ))
    return docs


# --- Vector Store ---
def create_vector_store(docs):
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    vector_store = FAISS.from_documents(docs, embeddings)
    return vector_store


# --- Report Generation ---
def generate_medical_report(
    predicted_class: str,
    confidence: float,
    probabilities: dict,
    vector_store
):
    # 1. Retrieve relevant doc for predicted class only
    all_docs = vector_store.docstore._dict.values()
    context = ""
    for doc in all_docs:
        if doc.metadata.get("class", "").lower() == predicted_class.lower():
            context = doc.page_content
            break

    # Truncate to avoid token overflow
    context = context[:1500]

    # 2. Format probabilities cleanly
    prob_text = ", ".join(
        [f"{k}: {round(v * 100, 1)}%" for k, v in probabilities.items()]
    )

    # 3. Build differential text (only classes > 15% excluding top class)
    differential_text = "None significant."
    significant = {
        k: v for k, v in probabilities.items()
        if v > 0.15 and k.lower() != predicted_class.lower()
    }
    if significant:
        differential_text = ", ".join(
            [f"{k} ({round(v*100, 1)}%)" for k, v in significant.items()]
        )

    # 4. Setup LLM
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY environment variable not set.")

#     llm = ChatGroq(
#         temperature=0,
#         groq_api_key=groq_api_key,
#         model_name="openai/gpt-oss-20b",
#         max_tokens=1000
#     )

#     # 5. Prompt
#     prompt_template = """
# You are a medical assistant AI specialized in chest X-ray interpretation.
# Generate a structured clinical report based on the classification result below.

# Predicted Condition: {predicted_class}
# Confidence: {confidence}%
# All Probabilities: {prob_text}
# Differential to mention: {differential_text}

# Clinical Reference Context:
# {context}

# IMPORTANT RULES:
# - Respond ONLY with valid JSON, no extra text, no markdown, no code blocks
# - Use plain ASCII only, no special characters
# - Keep each field concise and complete, do not cut off mid-sentence
# - Base findings strictly on the context provided

# Respond with exactly this JSON structure:
# {{
#   "introduction": "One sentence stating predicted condition and confidence score.",
#   "radiological_findings": "2-3 sentences describing typical radiological findings for this condition.",
#   "symptoms": "List the main symptoms as a plain text comma-separated list.",
#   "severity": "One sentence about severity classification if applicable.",
#   "differential": "Mention other conditions if significant, or state None.",
#   "next_steps": "Numbered list as a single string: 1. step one. 2. step two. 3. step three.",
#   "treatment_summary": "2 sentences summarizing key treatment approach.",
#   "disclaimer": "This report is AI-generated for research purposes only and is not a substitute for professional medical diagnosis or treatment."
# }}
# """

#     prompt = ChatPromptTemplate.from_template(prompt_template)
#     chain = prompt | llm

#     # 6. Invoke
#     response = chain.invoke({
#         "predicted_class": predicted_class,
#         "confidence": round(confidence * 100, 1),
#         "prob_text": prob_text,
#         "differential_text": differential_text,
#         "context": context,
#     })

#     print("=== RAW LLM RESPONSE ===")
#     print(response.content)
#     print("========================")
# TO:
    client = OpenAI(
        api_key=groq_api_key,
        base_url="https://api.groq.com/openai/v1",
    )

    # 5. Prompt
    prompt_text = f"""
You are a medical assistant AI specialized in chest X-ray interpretation.
Generate a structured clinical report based on the classification result below.

Predicted Condition: {predicted_class}
Confidence: {round(confidence * 100, 1)}%
All Probabilities: {prob_text}
Differential to mention: {differential_text}

Clinical Reference Context:
{context}

IMPORTANT RULES:
- Respond ONLY with valid JSON, no extra text, no markdown, no code blocks
- Use plain ASCII only, no special characters
- Keep each field concise and complete, do not cut off mid-sentence
- Base findings strictly on the context provided

Respond with exactly this JSON structure:
{{
  "introduction": "One sentence stating predicted condition and confidence score.",
  "radiological_findings": "2-3 sentences describing typical radiological findings for this condition.",
  "symptoms": "List the main symptoms as a plain text comma-separated list.",
  "severity": "One sentence about severity classification if applicable.",
  "differential": "Mention other conditions if significant, or state None.",
  "next_steps": "Numbered list as a single string: 1. step one. 2. step two. 3. step three.",
  "treatment_summary": "2 sentences summarizing key treatment approach.",
  "disclaimer": "This report is AI-generated for research purposes only and is not a substitute for professional medical diagnosis or treatment."
}}
"""

    # # 6. Invoke
    # response = client.chat.completions.create(
    #     model="openai/gpt-oss-20b",
    #     messages=[{"role": "user", "content": prompt_text}],
    #     max_tokens=1000,
    #     temperature=0,
    # )

    # raw_content = response.choices[0].message.content
    # print("=== RAW LLM RESPONSE ===")
    # print(raw_content)
    # print("========================")
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt_text}],
        max_tokens=2000,
        temperature=0,
    )

    print("=== FULL RESPONSE OBJECT ===")
    print(response)
    raw_content = response.choices[0].message.content
    raw_content = raw_content.encode("ascii", "ignore").decode("ascii")
    print("=== RAW LLM RESPONSE ===")
    print(raw_content)
    print("========================")

   # 7. Parse JSON
    try:
        clean = raw_content.strip()
        # Strip markdown fences if model adds them anyway
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        report = json.loads(clean.strip())
    except json.JSONDecodeError:
        # Fallback: return raw content in a structured way
        report = {
            "introduction": f"Predicted condition: {predicted_class} with {round(confidence * 100, 1)}% confidence.",
            "radiological_findings": raw_content,
            "symptoms": "See full context.",
            "severity": "",
            "differential": differential_text,
            "next_steps": "Please consult a medical professional.",
            "treatment_summary": "",
            "disclaimer": "This report is AI-generated and not a substitute for professional medical diagnosis."
        }

    return report


# --- Initialize on import ---
medical_docs = load_medical_docs()
vector_store = create_vector_store(medical_docs)
