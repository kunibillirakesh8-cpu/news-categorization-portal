import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

app = FastAPI(title="KIET News Hub Classifier", version="1.0.0")
API_KEY = os.getenv("ML_API_KEY", "demo-local-ml-key")

TRAINING_EXAMPLES = [
    ("education", "university college campus students exams semester professor education scholarship"),
    ("education", "school classroom teacher learning students academic research institute"),
    ("education", "KIET student faculty workshop department campus admissions course"),
    ("technology", "software technology startup digital platform cybersecurity cloud computing"),
    ("technology", "new smartphone chip network app developer technology product"),
    ("technology", "tech company launches data centre broadband internet infrastructure"),
    ("ai", "artificial intelligence machine learning generative AI model language neural network"),
    ("ai", "researchers train an AI system using machine learning and data science"),
    ("ai", "AI tools and intelligent automation reshape software engineering"),
    ("science", "scientists research experiment discovery laboratory climate biology physics"),
    ("science", "new study examines clean energy materials and environmental science"),
    ("science", "research team publishes findings from a scientific study"),
    ("business", "markets business economy company investment revenue financial earnings"),
    ("business", "shares rise as investors assess quarterly corporate profit"),
    ("business", "trade policy small business startup funding and economic growth"),
    ("sports", "sports team wins match league tournament championship final score"),
    ("sports", "athletes compete in cricket football basketball national sporting event"),
    ("sports", "coach announces squad ahead of the international sporting series"),
    ("jobs", "jobs careers hiring recruitment placement employment vacancies graduates"),
    ("jobs", "companies offer new roles and internships for graduating students"),
    ("jobs", "recruiters host a campus placement drive for engineering candidates"),
    ("hyderabad", "Hyderabad Telangana metro city transport electric buses urban roads"),
    ("hyderabad", "Telangana government announces development plans for Hyderabad city"),
    ("hyderabad", "Ghaziabad KIET campus local community and regional city news"),
    ("india", "India national government parliament policy election public services"),
    ("india", "Indian states announce national plans for citizens across the country"),
    ("world", "international world leaders global foreign affairs diplomatic relations"),
    ("world", "countries across the world discuss international trade and cooperation"),
    ("entertainment", "film music television actor entertainment cinema streaming"),
    ("entertainment", "new movie release concert artist performance cultural festival"),
]

vectorizer = Pipeline(
    [
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
        ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ]
)
vectorizer.fit(
    [text for _, text in TRAINING_EXAMPLES],
    [label for label, _ in TRAINING_EXAMPLES],
)


class ClassificationRequest(BaseModel):
    text: str = Field(min_length=10, max_length=20_000)
    rule_tags: list[str] = Field(default_factory=list, max_length=20)


class ClassificationResponse(BaseModel):
    category: str
    confidence: float
    keywords: list[str]
    rule_tags: list[str]
    classifier: str = "tfidf-logistic-regression"


def require_api_key(
    provided_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> None:
    if not provided_key or not secrets.compare_digest(provided_key, API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "tfidf-logistic-regression"}


@app.post(
    "/classify",
    response_model=ClassificationResponse,
    dependencies=[Depends(require_api_key)],
)
def classify(request: ClassificationRequest) -> ClassificationResponse:
    probabilities = vectorizer.predict_proba([request.text])[0]
    model = vectorizer.named_steps["classifier"]
    best_index = int(probabilities.argmax())
    feature_names = vectorizer.named_steps["tfidf"].get_feature_names_out()
    vector = vectorizer.named_steps["tfidf"].transform([request.text])
    terms = vector.indices
    keywords = [
        str(feature_names[index])
        for index in sorted(terms, key=lambda index: vector[0, index], reverse=True)[:8]
    ]
    return ClassificationResponse(
        category=str(model.classes_[best_index]),
        confidence=round(float(probabilities[best_index]), 4),
        keywords=keywords,
        rule_tags=request.rule_tags,
    )