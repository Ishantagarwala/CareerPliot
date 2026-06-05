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
      <div className="flex bg-[#131313] p-1 border border-[#262626] self-start w-fit">
        <button
          onClick={() => setActiveSubTab("quiz")}
          className={`px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === "quiz"
              ? "bg-white text-[#0A0A0A]"
              : "text-[#8e9192] hover:text-white"
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          Practice Quiz ({mcqs.length})
        </button>
        <button
          onClick={() => setActiveSubTab("flashcards")}
          className={`px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === "flashcards"
              ? "bg-white text-[#0A0A0A]"
              : "text-[#8e9192] hover:text-white"
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          Flashcards ({flashcards.length})
        </button>
      </div>

      {activeSubTab === "quiz" && (
        <div>
          {mcqs.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#262626] p-6 text-center">
              <p className="text-sm text-[#8e9192]">No quiz questions generated for this document.</p>
            </div>
          ) : showQuizResults ? (
            <div className="bg-[#1A1A1A] border border-[#262626] text-center">
              <div className="p-6 border-b border-[#262626] space-y-2">
                <div className="mx-auto h-12 w-12 border border-[#262626] bg-[#131313] flex items-center justify-center text-white mb-3">
                  <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
                </div>
                <h3
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  Quiz Completed!
                </h3>
                <p className="text-sm text-[#8e9192]">Here is how you performed on the conceptual checks.</p>
              </div>
              <div className="p-6 space-y-6 max-w-md mx-auto">
                <div className="p-6 bg-[#131313] border border-[#262626]">
                  <div
                    className="text-4xl font-bold text-white"
                    style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                  >
                    {score} / {mcqs.length}
                  </div>
                  <div
                    className="text-[11px] text-[#8e9192] mt-1 uppercase tracking-[0.1em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Total Score
                  </div>
                  <div className="h-1 w-full bg-[#262626] overflow-hidden mt-4">
                    <div className="h-full bg-white progress-bar-fill" style={{ width: `${(score / mcqs.length) * 100}%` }} />
                  </div>
                  <div
                    className="text-sm font-bold text-white mt-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {Math.round((score / mcqs.length) * 100)}% Accuracy
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <h4 className="font-bold text-sm text-white">Review Answers:</h4>
                  {mcqs.map((q, idx) => {
                    const history = quizHistory.find((h) => h.questionIndex === idx);
                    return (
                      <div key={idx} className="p-3 border border-[#262626] bg-[#131313] text-xs space-y-1">
                        <p className="font-bold text-white">{idx + 1}. {q.question}</p>
                        <p className="text-[#8e9192]">
                          Your selection: <span className={history?.correct ? "text-white font-bold" : "text-[#ffb4ab] font-bold"}>{history?.selected}</span>
                        </p>
                        {!history?.correct && (
                          <p className="text-white font-bold">
                            Correct answer: {q.answer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-[#262626] flex justify-center">
                <button
                  onClick={restartQuiz}
                  className="inline-flex items-center px-5 py-2 bg-white text-[#0A0A0A] font-bold text-xs hover:bg-[#e2e2e2] transition-colors gap-1.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                >
                  <RotateCcw className="h-4 w-4" /> Restart Quiz
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-[#262626]">
              <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-white">quiz</span>
                  <h3
                    className="font-bold text-base text-white"
                    style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                  >
                    Concept Check
                  </h3>
                </div>
                <span
                  className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] px-2 py-0.5 border border-[#262626]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {currentMcqIndex + 1} / {mcqs.length}
                </span>
              </div>
              <div className="p-6 space-y-6">
                <p
                  className="font-bold text-base text-white leading-relaxed"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  {mcqs[currentMcqIndex].question}
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {mcqs[currentMcqIndex].options?.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectAnswer = option === mcqs[currentMcqIndex].answer;

                    let classes = "text-left w-full p-3.5 text-sm font-medium border transition-all flex items-center justify-between";

                    if (!quizSubmitted) {
                      classes += isSelected
                        ? " border-white bg-white/5 text-white"
                        : " border-[#262626] text-[#c4c7c8] hover:border-[#404040] hover:text-white";
                    } else {
                      if (isCorrectAnswer) {
                        classes += " border-white bg-white/10 text-white font-bold";
                      } else if (isSelected) {
                        classes += " border-[#ffb4ab] bg-[#ffb4ab]/5 text-[#ffb4ab] font-bold";
                      } else {
                        classes += " opacity-40 border-[#262626] text-[#8e9192]";
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
                        {quizSubmitted && isCorrectAnswer && <Check className="h-4 w-4 text-white shrink-0 ml-2" />}
                        {quizSubmitted && isSelected && !isCorrectAnswer && <X className="h-4 w-4 text-[#ffb4ab] shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-[#262626] flex justify-between items-center">
                <span
                  className="text-[10px] text-[#636565]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                >
                  {quizSubmitted ? "Press Next to proceed" : "Select an option to submit"}
                </span>
                <div className="flex gap-2">
                  {!quizSubmitted ? (
                    <button
                      disabled={!selectedOption}
                      onClick={submitAnswer}
                      className="px-5 py-2 bg-white text-[#0A0A0A] font-bold text-xs hover:bg-[#e2e2e2] transition-colors disabled:opacity-30"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      onClick={handleNextMcq}
                      className="px-5 py-2 bg-white text-[#0A0A0A] font-bold text-xs hover:bg-[#e2e2e2] transition-colors flex items-center gap-1"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
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
            <div className="bg-[#1A1A1A] border border-[#262626] p-6 text-center">
              <p className="text-sm text-[#8e9192]">No flashcards generated for this document.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-md h-64 flashcard-perspective cursor-pointer"
              >
                <div className={`flashcard-inner ${isFlipped ? "flashcard-flipped" : ""}`}>
                  {/* Front */}
                  <div className="flashcard-face bg-[#1A1A1A] border border-[#262626] text-white flex flex-col justify-between">
                    <div className="flex items-center justify-between w-full border-b border-[#262626] pb-2">
                      <span
                        className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] flex items-center gap-1"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                        Question
                      </span>
                      <span
                        className="text-[10px] text-[#636565]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Click to flip
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <p
                        className="font-bold text-base text-white max-w-xs text-center leading-relaxed"
                        style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                      >
                        {flashcards[currentFlashcardIndex].question}
                      </p>
                    </div>
                    <div
                      className="text-[10px] text-[#636565] pt-2 border-t border-[#262626] w-full text-center"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Flashcard {currentFlashcardIndex + 1} of {flashcards.length}
                    </div>
                  </div>

                  {/* Back */}
                  <div className="flashcard-face flashcard-back bg-white text-[#0A0A0A] flex flex-col justify-between">
                    <div className="flex items-center justify-between w-full border-b border-[#e2e2e2] pb-2">
                      <span
                        className="text-[11px] text-[#636565] uppercase tracking-[0.1em] flex items-center gap-1"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        <Check className="h-3 w-3" /> Answer
                      </span>
                      <span
                        className="text-[10px] text-[#8e9192]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Click to flip
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-center overflow-y-auto">
                      <p className="text-sm font-medium leading-relaxed max-w-xs text-center">
                        {flashcards[currentFlashcardIndex].answer}
                      </p>
                    </div>
                    <div
                      className="text-[10px] text-[#8e9192] pt-2 border-t border-[#e2e2e2] w-full text-center"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Flashcard {currentFlashcardIndex + 1} of {flashcards.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevFlashcard}
                  className="h-10 w-10 border border-[#262626] bg-[#1A1A1A] flex items-center justify-center text-white hover:border-[#404040] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>

                <span
                  className="text-xs text-[#8e9192]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {currentFlashcardIndex + 1} / {flashcards.length}
                </span>

                <button
                  onClick={handleNextFlashcard}
                  className="h-10 w-10 border border-[#262626] bg-[#1A1A1A] flex items-center justify-center text-white hover:border-[#404040] transition-colors"
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
