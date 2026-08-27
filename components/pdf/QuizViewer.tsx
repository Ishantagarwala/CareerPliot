"use client";

import React, { useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";

interface Question {
  question: string;
  options?: string[];
  answer: string;
  type: "mcq" | "flashcard";
}

interface QuizViewerProps {
  questions: Question[];
}

export default function QuizViewer({ questions }: QuizViewerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"quiz" | "flashcards">("quiz");

  // MCQ states
  const mcqs = questions.filter((q) => q.type === "mcq");
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizHistory, setQuizHistory] = useState<Array<{ questionIndex: number; selected: string; correct: boolean }>>([]);

  // Flashcard states
  const flashcards = questions.filter((q) => q.type === "flashcard");
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleOptionSelect = (option: string) => {
    if (quizSubmitted) return;
    setSelectedOption(option);
  };

  const submitAnswer = () => {
    if (!selectedOption || quizSubmitted) return;

    const isCorrect = selectedOption === mcqs[currentMcqIndex].answer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setQuizHistory((prev) => [
      ...prev,
      {
        questionIndex: currentMcqIndex,
        selected: selectedOption,
        correct: isCorrect,
      },
    ]);

    setQuizSubmitted(true);
  };

  const handleNextMcq = () => {
    if (currentMcqIndex < mcqs.length - 1) {
      setCurrentMcqIndex((prev) => prev + 1);
      setSelectedOption(null);
      setQuizSubmitted(false);
    } else {
      setShowQuizResults(true);
    }
  };

  const restartQuiz = () => {
    setCurrentMcqIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setScore(0);
    setShowQuizResults(false);
    setQuizHistory([]);
  };

  const handleNextFlashcard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentFlashcardIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
    }, 150);
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentFlashcardIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
    }, 150);
  };

  return (
    <div className="space-y-6">
      <style>{`
        .flashcard-perspective { perspective: 1000px; }
        .flashcard-inner {
          position: relative; width: 100%; height: 100%;
          text-align: center; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flashcard-flipped { transform: rotateY(180deg); }
        .flashcard-face {
          position: absolute; width: 100%; height: 100%; backface-visibility: hidden;
          display: flex; flex-direction: column; justify-content: center; align-items: center;
          padding: 2rem;
        }
        .flashcard-back { transform: rotateY(180deg); }
      `}</style>

      {/* Sub tabs */}
      <div className="flex w-fit self-start rounded-xl border border-border bg-muted p-1">
        <button
          onClick={() => setActiveSubTab("quiz")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            activeSubTab === "quiz"
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Practice Quiz ({mcqs.length})
        </button>
        <button
          onClick={() => setActiveSubTab("flashcards")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            activeSubTab === "flashcards"
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Flashcards ({flashcards.length})
        </button>
      </div>

      {activeSubTab === "quiz" && (
        <div>
          {mcqs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">No quiz questions generated for this document.</p>
            </div>
          ) : showQuizResults ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card text-center shadow-soft">
              <div className="border-b border-border p-6 space-y-2">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Quiz Completed!
                </h3>
                <p className="text-sm text-muted-foreground">Here is how you performed on the conceptual checks.</p>
              </div>
              <div className="max-w-md mx-auto space-y-6 p-6">
                <div className="rounded-xl border border-border bg-muted p-6">
                  <div className="text-4xl font-bold text-foreground">
                    {score} / {mcqs.length}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-muted-foreground">
                    Total Score
                  </div>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div className="progress-bar-fill h-full w-full rounded-full bg-primary" style={{ transform: `scaleX(${score / mcqs.length})` }} />
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    {Math.round((score / mcqs.length) * 100)}% Accuracy
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <h4 className="text-sm font-bold text-foreground">Review Answers:</h4>
                  {mcqs.map((q, idx) => {
                    const history = quizHistory.find((h) => h.questionIndex === idx);
                    return (
                      <div key={idx} className="space-y-1 rounded-lg border border-border bg-muted p-3 text-xs">
                        <p className="font-bold text-foreground">{idx + 1}. {q.question}</p>
                        <p className="text-muted-foreground">
                          Your selection: <span className={history?.correct ? "font-bold text-primary" : "font-bold text-destructive"}>{history?.selected}</span>
                        </p>
                        {!history?.correct && (
                          <p className="font-bold text-primary">
                            Correct answer: {q.answer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-center border-t border-border p-4">
                <button
                  onClick={restartQuiz}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
                >
                  <RotateCcw className="h-4 w-4" /> Restart Quiz
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">quiz</span>
                  <h3 className="text-base font-bold text-foreground">
                    Concept Check
                  </h3>
                </div>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {currentMcqIndex + 1} / {mcqs.length}
                </span>
              </div>
              <div className="space-y-6 p-6">
                <p className="text-base font-bold leading-relaxed text-foreground">
                  {mcqs[currentMcqIndex].question}
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {mcqs[currentMcqIndex].options?.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectAnswer = option === mcqs[currentMcqIndex].answer;

                    let classes = "flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-medium transition-all";

                    if (!quizSubmitted) {
                      classes += isSelected
                        ? " border-ring bg-primary/10 text-foreground"
                        : " border-border bg-card text-foreground hover:border-ring/50 hover:bg-muted";
                    } else {
                      if (isCorrectAnswer) {
                        classes += " border-primary bg-primary/10 font-bold text-primary";
                      } else if (isSelected) {
                        classes += " border-destructive/50 bg-destructive/10 font-bold text-destructive";
                      } else {
                        classes += " border-border bg-card text-muted-foreground opacity-40";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={quizSubmitted}
                        onClick={() => handleOptionSelect(option)}
                        className={classes}
                      >
                        <span className="flex-1 text-left">{option}</span>
                        {quizSubmitted && isCorrectAnswer && <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />}
                        {quizSubmitted && isSelected && !isCorrectAnswer && <X className="ml-2 h-4 w-4 shrink-0 text-destructive" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border p-4">
                <span className="text-[11px] text-muted-foreground">
                  {quizSubmitted ? "Press Next to proceed" : "Select an option to submit"}
                </span>
                <div className="flex gap-2">
                  {!quizSubmitted ? (
                    <button
                      disabled={!selectedOption}
                      onClick={submitAnswer}
                      className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-30"
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      onClick={handleNextMcq}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
                    >
                      {currentMcqIndex === mcqs.length - 1 ? "Finish" : "Next"}
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "flashcards" && (
        <div>
          {flashcards.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">No flashcards generated for this document.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="flashcard-perspective w-full max-w-md h-64 cursor-pointer"
              >
                <div className={`flashcard-inner ${isFlipped ? "flashcard-flipped" : ""}`}>
                  {/* Front */}
                  <div className="flashcard-face rounded-2xl border border-border bg-card text-card-foreground shadow-soft flex flex-col justify-between">
                    <div className="flex w-full items-center justify-between border-b border-border pb-2">
                      <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                        <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                        Question
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Click to flip
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <p className="max-w-xs text-center text-base font-bold leading-relaxed text-foreground">
                        {flashcards[currentFlashcardIndex].question}
                      </p>
                    </div>
                    <div className="w-full border-t border-border pt-2 text-center text-[11px] text-muted-foreground">
                      Flashcard {currentFlashcardIndex + 1} of {flashcards.length}
                    </div>
                  </div>

                  {/* Back */}
                  <div className="flashcard-face flashcard-back rounded-2xl border border-accent bg-accent text-accent-foreground shadow-soft flex flex-col justify-between">
                    <div className="flex w-full items-center justify-between border-b border-accent-foreground/20 pb-2">
                      <span className="flex items-center gap-1 text-[13px] font-medium text-accent-foreground/80">
                        <Check className="h-3 w-3" /> Answer
                      </span>
                      <span className="text-[11px] text-accent-foreground/70">
                        Click to flip
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-center overflow-y-auto">
                      <p className="max-w-xs text-center text-sm font-medium leading-relaxed">
                        {flashcards[currentFlashcardIndex].answer}
                      </p>
                    </div>
                    <div className="w-full border-t border-accent-foreground/20 pt-2 text-center text-[11px] text-accent-foreground/70">
                      Flashcard {currentFlashcardIndex + 1} of {flashcards.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevFlashcard}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>

                <span className="text-xs text-muted-foreground">
                  {currentFlashcardIndex + 1} / {flashcards.length}
                </span>

                <button
                  onClick={handleNextFlashcard}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
