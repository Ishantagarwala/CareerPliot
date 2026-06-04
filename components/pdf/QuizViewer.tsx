"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, ChevronLeft, ChevronRight, RotateCcw, Check, X, Sparkles, BookOpen } from "lucide-react";

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

  // MCQ functions
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

  // Flashcard functions
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
      {/* Stylesheet for 3D Flashcard flips */}
      <style>{`
        .flashcard-perspective {
          perspective: 1000px;
        }
        .flashcard-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flashcard-flipped {
          transform: rotateY(180deg);
        }
        .flashcard-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          border-radius: var(--radius);
        }
        .flashcard-back {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Sub tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveSubTab("quiz")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeSubTab === "quiz"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Practice Quiz ({mcqs.length})
        </button>
        <button
          onClick={() => setActiveSubTab("flashcards")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeSubTab === "flashcards"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Flashcards ({flashcards.length})
        </button>
      </div>

      {/* Content wrapper */}
      <div>
        {activeSubTab === "quiz" && (
          <div>
            {mcqs.length === 0 ? (
              <Card className="border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No quiz questions generated for this document.</p>
              </Card>
            ) : showQuizResults ? (
              /* Quiz Results */
              <Card className="border-border bg-card shadow-sm text-center">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <CardTitle className="font-heading text-2xl font-bold">Quiz Completed!</CardTitle>
                  <CardDescription>Here is how you performed on the conceptual checks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-w-md mx-auto">
                  <div className="p-6 bg-muted/50 rounded-2xl border border-border">
                    <div className="text-4xl font-extrabold text-foreground">{score} / {mcqs.length}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-1">Total Score</div>
                    <Progress value={(score / mcqs.length) * 100} className="h-2 mt-4 bg-muted" />
                    <div className="text-sm font-semibold text-primary mt-2">
                      {Math.round((score / mcqs.length) * 100)}% Accuracy
                    </div>
                  </div>

                  <div className="space-y-3 text-left">
                    <h4 className="font-bold text-sm text-foreground">Review Answers:</h4>
                    {mcqs.map((q, idx) => {
                      const history = quizHistory.find((h) => h.questionIndex === idx);
                      return (
                        <div key={idx} className="p-3 border border-border/50 rounded-xl bg-card text-xs space-y-1">
                          <p className="font-bold text-foreground">{idx + 1}. {q.question}</p>
                          <p className="text-muted-foreground">
                            Your selection: <span className={history?.correct ? "text-emerald-500 font-semibold" : "text-destructive font-semibold"}>{history?.selected}</span>
                          </p>
                          {!history?.correct && (
                            <p className="text-emerald-500 font-semibold">
                              Correct answer: {q.answer}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
                <CardFooter className="justify-center border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20 pt-4">
                  <Button onClick={restartQuiz} className="font-semibold flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4" /> Restart Quiz
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              /* Active MCQ Question */
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="font-heading text-lg font-bold">Concept Check</CardTitle>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    Question {currentMcqIndex + 1} of {mcqs.length}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <p className="font-heading font-semibold text-base text-foreground leading-relaxed">
                    {mcqs[currentMcqIndex].question}
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    {mcqs[currentMcqIndex].options?.map((option, idx) => {
                      const isSelected = selectedOption === option;
                      const isCorrectAnswer = option === mcqs[currentMcqIndex].answer;
                      
                      let btnStyle = "border-border hover:bg-muted/50 hover:text-foreground text-left justify-start h-auto py-3.5 px-4 text-sm font-medium w-full border rounded-xl transition-all";
                      
                      if (isSelected) {
                        btnStyle += " border-primary bg-primary/5 text-foreground";
                      }
                      
                      if (quizSubmitted) {
                        if (isCorrectAnswer) {
                          btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-left justify-start h-auto py-3.5 px-4 text-sm font-semibold w-full border rounded-xl flex items-center justify-between";
                        } else if (isSelected) {
                          btnStyle = "border-destructive bg-destructive/10 text-destructive text-left justify-start h-auto py-3.5 px-4 text-sm font-semibold w-full border rounded-xl flex items-center justify-between";
                        } else {
                          btnStyle = "opacity-50 border-border text-left justify-start h-auto py-3.5 px-4 text-sm font-medium w-full border rounded-xl";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={quizSubmitted}
                          onClick={() => handleOptionSelect(option)}
                          className={btnStyle}
                        >
                          <span className="flex-1">{option}</span>
                          {quizSubmitted && isCorrectAnswer && <Check className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />}
                          {quizSubmitted && isSelected && !isCorrectAnswer && <X className="h-4 w-4 text-destructive shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20 pt-4">
                  <div className="text-xs text-muted-foreground font-semibold">
                    {quizSubmitted ? "Press Next to proceed" : "Select an option to submit"}
                  </div>
                  <div className="flex gap-2">
                    {!quizSubmitted ? (
                      <Button
                        disabled={!selectedOption}
                        onClick={submitAnswer}
                        className="font-semibold"
                      >
                        Submit
                      </Button>
                    ) : (
                      <Button onClick={handleNextMcq} className="font-semibold flex items-center gap-1">
                        {currentMcqIndex === mcqs.length - 1 ? "Finish" : "Next"}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            )}
          </div>
        )}

        {activeSubTab === "flashcards" && (
          <div>
            {flashcards.length === 0 ? (
              <Card className="border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No flashcards generated for this document.</p>
              </Card>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                {/* 3D Flippable Card Frame */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full max-w-md h-64 flashcard-perspective cursor-pointer"
                >
                  <div className={`flashcard-inner ${isFlipped ? "flashcard-flipped" : ""}`}>
                    {/* Front Side */}
                    <div className="flashcard-face bg-card border border-border text-card-foreground shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between w-full border-b border-border/50 pb-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1 font-semibold text-[10px]">
                          <BookOpen className="h-3 w-3" /> Question
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold">Click to flip</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <p className="font-heading font-bold text-base text-foreground max-w-xs text-center leading-relaxed">
                          {flashcards[currentFlashcardIndex].question}
                        </p>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium pt-2 border-t border-border/50 w-full text-center">
                        Flashcard {currentFlashcardIndex + 1} of {flashcards.length}
                      </div>
                    </div>

                    {/* Back Side */}
                    <div className="flashcard-face flashcard-back bg-primary text-primary-foreground shadow-md flex flex-col justify-between">
                      <div className="flex items-center justify-between w-full border-b border-primary-foreground/20 pb-2">
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 flex items-center gap-1 font-semibold text-[10px]">
                          <Check className="h-3 w-3" /> Answer
                        </Badge>
                        <span className="text-[10px] text-white/70 font-semibold">Click to flip</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center overflow-y-auto">
                        <p className="font-heading font-medium text-sm leading-relaxed max-w-xs text-center">
                          {flashcards[currentFlashcardIndex].answer}
                        </p>
                      </div>
                      <div className="text-[10px] text-white/70 font-medium pt-2 border-t border-primary-foreground/20 w-full text-center">
                        Flashcard {currentFlashcardIndex + 1} of {flashcards.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Control Panel */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevFlashcard}
                    className="h-10 w-10 border-border bg-card rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </Button>
                  
                  <span className="text-xs font-semibold text-muted-foreground">
                    {currentFlashcardIndex + 1} / {flashcards.length}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextFlashcard}
                    className="h-10 w-10 border-border bg-card rounded-full"
                  >
                    <ChevronRight className="h-5 w-5 text-foreground" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
