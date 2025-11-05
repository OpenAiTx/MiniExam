import { useState, useEffect } from "react";
import { useKV } from "@github/spark/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  ChartLine,
  BookOpen,
  Warning,
  Database,
  ArrowCounterClockwise,
  House,
  ListNumbers,
  StopCircle,
  Star,
  Fire,
  Gear,
  Play,
  Trash,
  X,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Question,
  QuestionStats,
  ExamResult,
  Subject,
  loadQuestions,
  saveQuestions,
  resetToDefaultQuestions,
  getRandomQuestions,
  getWrongQuestions,
  getUnattemptedQuestions,
  getImportantQuestions,
  getFrequentlyWrongQuestions,
  loadSubjects,
  saveSubjects,
} from "@/lib/questions";
import { QuestionManager } from "@/components/QuestionManager";
import { Settings } from "@/components/Settings";
import { SubjectManager } from "@/components/SubjectManager";
import { QuestionEditor } from "@/components/QuestionEditor";

type ExamState =
  | "subject-select"
  | "welcome"
  | "exam"
  | "result"
  | "history"
  | "stats"
  | "questions"
  | "settings"
  | "subject-manager";

type ExamMode = "all" | "random" | "wrong" | "unattempted" | "important" | "frequently-wrong";
type QuestionCount = "10" | "20" | "30" | "all";

function App() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [examState, setExamState] = useState<ExamState>("subject-select");
  const [examMode, setExamMode] = useState<ExamMode>("all");
  const [questionCount, setQuestionCount] = useState<QuestionCount>("10");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [allQuestionsMap, setAllQuestionsMap] = useState<Record<string, Question[]>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ questionId: number; answer: string[] }[]>([]);
  const [questionStats, setQuestionStats] = useKV<Record<string, QuestionStats[]>>(
    "question-stats",
    {}
  );
  const [examResults, setExamResults] = useKV<ExamResult[]>("exam-results", []);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [removedQuestionIds, setRemovedQuestionIds] = useState<number[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    loadSubjects().then(setSubjects);
  }, []);

  const selectSubject = async (subject: Subject) => {
    setCurrentSubject(subject);
    setLoading(true);
    try {
      const loadedQuestions = await loadQuestions(subject.id);
      setAllQuestions(loadedQuestions);
      setAllQuestionsMap((prev) => ({
        ...prev,
        [subject.id]: loadedQuestions,
      }));
      if (loadedQuestions.length === 0) {
        toast.error("無法載入題庫，請檢查題庫檔案");
      }
      setExamState("welcome");
    } catch (error) {
      toast.error("載入題庫失敗");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const backToSubjectSelect = () => {
    setCurrentSubject(null);
    setAllQuestions([]);
    setExamState("subject-select");
  };

  const startExam = (mode: ExamMode = "all", count: QuestionCount = "10") => {
    if (allQuestions.length === 0) {
      toast.error("題庫尚未載入，請稍候");
      return;
    }
    if (!currentSubject) {
      return;
    }

    let examQuestions: Question[] = [];
    const currentSubjectStats = questionStats?.[currentSubject.id] || [];

    if (mode === "wrong") {
      const wrongQs = getWrongQuestions(currentSubjectStats, allQuestions);
      if (wrongQs.length === 0) {
        toast.info("沒有錯誤題目，請繼續加油！");
        return;
      }
      examQuestions = wrongQs;
    } else if (mode === "unattempted") {
      const unattemptedQs = getUnattemptedQuestions(currentSubjectStats, allQuestions);
      if (unattemptedQs.length === 0) {
        toast.info("所有題目都已經作答過了！");
        return;
      }
      examQuestions = unattemptedQs;
    } else if (mode === "important") {
      const importantQs = getImportantQuestions(currentSubjectStats, allQuestions);
      if (importantQs.length === 0) {
        toast.info("尚未標記重點題目");
        return;
      }
      examQuestions = importantQs;
    } else if (mode === "frequently-wrong") {
      const frequentlyWrongQs = getFrequentlyWrongQuestions(currentSubjectStats, allQuestions);
      if (frequentlyWrongQs.length === 0) {
        toast.info("沒有錯誤 2 次以上的題目");
        return;
      }
      examQuestions = frequentlyWrongQs;
    } else {
      if (mode === "random" && count !== "all") {
        examQuestions = getRandomQuestions(parseInt(count), allQuestions);
      } else {
        examQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
      }
      toast.success(`開始考試，共 ${examQuestions.length} 題`);
    }

    setExamMode(mode);
    setQuestions(examQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setUserAnswers([]);
    setStartTime(Date.now());
    setShowAnswer(false);
    setIsAnswerCorrect(null);
    setExamState("exam");
    setRemovedQuestionIds([]);
  };

  const handleAnswerSelect = (answer: string, isMultiple: boolean) => {
    if (showAnswer) return;
    if (isMultiple) {
      setSelectedAnswers((current) =>
        current.includes(answer)
          ? current.filter((a) => a !== answer)
          : [...current, answer]
      );
    } else {
      setSelectedAnswers([answer]);
    }
  };

  const checkAnswer = () => {
    if (selectedAnswers.length === 0 && questions[currentQuestionIndex].type !== "fill_in_the_blanks") {
      toast.error("請選擇答案");
      return;
    }

    let correct = false;
    const currentQuestion = questions[currentQuestionIndex];

    if (currentQuestion.type === "fill_in_the_blanks") {
      const userAnswer = selectedAnswers[0]?.toLowerCase().trim() || "";
      const correctAnswers = currentQuestion.correctAnswer.map((ans) =>
        ans.toLowerCase().trim()
      );
      correct = correctAnswers.some((ans) => ans === userAnswer);
    } else {
      const sortedSelected = [...selectedAnswers].sort();
      const sortedCorrect = [...currentQuestion.correctAnswer].sort();
      correct =
        sortedSelected.length === sortedCorrect.length &&
        sortedSelected.every((a, i) => a === sortedCorrect[i]);
    }

    setIsAnswerCorrect(correct);
    setShowAnswer(true);
    
    const newAnswers = [
      ...userAnswers,
      { questionId: currentQuestion.id, answer: selectedAnswers },
    ];
    setUserAnswers(newAnswers);
    updateQuestionStats(currentQuestion, correct);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      jumpToQuestion(currentQuestionIndex + 1);
    } else {
      const answeredUserAnswers = userAnswers.filter((ua) =>
        questions.some((q) => q.id === ua.questionId)
      );
      if (showAnswer && isAnswerCorrect !== null) {
        answeredUserAnswers.push({
          questionId: questions[currentQuestionIndex].id,
          answer: selectedAnswers,
        });
      }
      if (answeredUserAnswers.length === 0) {
        toast.error("請至少回答一題");
        return;
      }
      finishExam(answeredUserAnswers);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      jumpToQuestion(currentQuestionIndex - 1);
    }
  };

  const updateQuestionStats = (question: Question, isCorrect: boolean) => {
    if (!currentSubject) return;
    
    setQuestionStats((current) => {
      const allStats = current || {};
      const subjectStats = allStats[currentSubject.id] || [];
      const existingIndex = subjectStats.findIndex((s) => s.questionId === question.id);

      let updatedSubjectStats: QuestionStats[];

      if (existingIndex >= 0) {
        updatedSubjectStats = [...subjectStats];
        updatedSubjectStats[existingIndex] = {
          ...updatedSubjectStats[existingIndex],
          correctCount: isCorrect
            ? updatedSubjectStats[existingIndex].correctCount + 1
            : updatedSubjectStats[existingIndex].correctCount,
          incorrectCount: !isCorrect
            ? updatedSubjectStats[existingIndex].incorrectCount + 1
            : updatedSubjectStats[existingIndex].incorrectCount,
          lastAttempt: Date.now(),
        };
      } else {
        updatedSubjectStats = [
          ...subjectStats,
          {
            questionId: question.id,
            correctCount: isCorrect ? 1 : 0,
            incorrectCount: isCorrect ? 0 : 1,
            lastAttempt: Date.now(),
          },
        ];
      }

      return {
        ...allStats,
        [currentSubject.id]: updatedSubjectStats,
      };
    });
  };

  const finishExam = (answers: { questionId: number; answer: string[] }[]) => {
    const timeSpent = Date.now() - startTime;

    let correctCount = 0;
    const detailedAnswers = questions.map((q) => {
      const userAnswer = answers.find((a) => a.questionId === q.id);
      const isCorrect =
        userAnswer?.answer &&
        JSON.stringify([...userAnswer.answer].sort()) ===
          JSON.stringify([...q.correctAnswer].sort());
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        questionType: q.type,
        selectedAnswer: userAnswer?.answer || [],
        correctAnswer: q.correctAnswer,
        isCorrect: !!isCorrect,
        explanation: q.explanation,
      };
    });

    const currentResult: ExamResult = {
      id: Date.now().toString(),
      date: Date.now(),
      score: Math.round((correctCount / questions.length) * 100),
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      timeSpent,
      subjectId: currentSubject?.id || "",
      answers: detailedAnswers,
    };

    setExamResults((current) => [currentResult, ...(current || [])]);
    setExamState("result");
  };

  const endExamEarly = () => {
    if (!window.confirm("確定要提前結束考試嗎？已作答的題目將會被計分。")) {
      return;
    }

    const answeredUserAnswers = userAnswers.filter((ua) =>
      questions.some((q) => q.id === ua.questionId)
    );
    if (showAnswer && selectedAnswers.length > 0) {
      answeredUserAnswers.push({
        questionId: questions[currentQuestionIndex].id,
        answer: selectedAnswers,
      });
    }
    if (answeredUserAnswers.length === 0) {
      toast.error("請至少回答一題");
      return;
    }

    finishExam(answeredUserAnswers);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentResult =
    examState === "result"
      ? (examResults || [])[0]
      : null;
  const currentSubjectStats = currentSubject ? questionStats?.[currentSubject.id] || [] : [];
  const unattemptedQuestionsCount = getUnattemptedQuestions(currentSubjectStats, allQuestions).length;
  const wrongQuestionsCount = getWrongQuestions(currentSubjectStats, allQuestions).length;
  const importantQuestionsCount = getImportantQuestions(currentSubjectStats, allQuestions).length;
  const frequentlyWrongQuestionsCount = getFrequentlyWrongQuestions(currentSubjectStats, allQuestions).length;

  const toggleImportant = (questionId: number) => {
    if (!currentSubject) return;

    setQuestionStats((current) => {
      const allStats = current || {};
      const subjectStats = allStats[currentSubject.id] || [];
      const existingIndex = subjectStats.findIndex((s) => s.questionId === questionId);

      let updatedSubjectStats: QuestionStats[];

      if (existingIndex >= 0) {
        updatedSubjectStats = [...subjectStats];
        updatedSubjectStats[existingIndex] = {
          ...updatedSubjectStats[existingIndex],
          isImportant: !updatedSubjectStats[existingIndex].isImportant,
        };
      } else {
        updatedSubjectStats = [
          ...subjectStats,
          {
            questionId,
            correctCount: 0,
            incorrectCount: 0,
            isImportant: true,
          },
        ];
      }

      return {
        ...allStats,
        [currentSubject.id]: updatedSubjectStats,
      };
    });
  };

  const removeFromStats = (questionId: number) => {
    if (!currentSubject) return;

    setQuestionStats((current) => {
      const allStats = current || {};
      const updatedSubjectStats = (allStats[currentSubject.id] || []).filter(
        (s) => s.questionId !== questionId
      );
      return {
        ...allStats,
        [currentSubject.id]: updatedSubjectStats,
      };
    });
  };

  const jumpToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    
    const targetQuestion = questions[index];
    const previousAnswer = userAnswers.find(ua => ua.questionId === targetQuestion.id);
    
    if (previousAnswer) {
      setSelectedAnswers(previousAnswer.answer);
      
      let correct = false;
      if (targetQuestion.type === "fill_in_the_blanks") {
        const userAnswer = previousAnswer.answer[0]?.toLowerCase().trim() || "";
        const correctAnswers = targetQuestion.correctAnswer.map((ans) =>
          ans.toLowerCase().trim()
        );
        correct = correctAnswers.some((ans) => ans === userAnswer);
      } else {
        const sortedSelected = [...previousAnswer.answer].sort();
        const sortedCorrect = [...targetQuestion.correctAnswer].sort();
        correct =
          sortedSelected.length === sortedCorrect.length &&
          sortedSelected.every((a, i) => a === sortedCorrect[i]);
      }
      
      setShowAnswer(true);
      setIsAnswerCorrect(correct);
    } else {
      setSelectedAnswers([]);
      setShowAnswer(false);
      setIsAnswerCorrect(null);
    }
    
    setCurrentQuestionIndex(index);
  };

  const removeCurrentQuestion = () => {
    if (!window.confirm("確定要永久移除這道題目嗎？移除後此題目將從題庫中刪除，不會再出現在任何考試中。")) {
      return;
    }

    const currentQuestionId = questions[currentQuestionIndex].id;
    
    const updatedAllQuestions = allQuestions.filter((q) => q.id !== currentQuestionId);
    setAllQuestions(updatedAllQuestions);
    
    if (currentSubject) {
      setAllQuestionsMap((prev) => ({
        ...prev,
        [currentSubject.id]: updatedAllQuestions,
      }));
      saveQuestions(currentSubject.id, updatedAllQuestions);
    }

    const newRemovedIds = [...removedQuestionIds, currentQuestionId];
    setRemovedQuestionIds(newRemovedIds);

    const filteredQuestions = questions.filter((q) => !newRemovedIds.includes(q.id));
    
    if (filteredQuestions.length === 0) {
      toast.success("所有題目都已被移除，考試結束");
      setExamState("welcome");
      return;
    }

    setQuestions(filteredQuestions);

    if (currentQuestionIndex >= filteredQuestions.length) {
      setCurrentQuestionIndex(filteredQuestions.length - 1);
    }

    setSelectedAnswers([]);
    setShowAnswer(false);
    setIsAnswerCorrect(null);
    
    removeFromStats(currentQuestionId);
    
    toast.success("題目已永久移除");
  };

  const editCurrentQuestion = () => {
    setEditingQuestion(questions[currentQuestionIndex]);
  };

  const handleQuestionSave = (updatedQuestion: Question) => {
    const updatedAllQuestions = allQuestions.map((q) =>
      q.id === updatedQuestion.id ? updatedQuestion : q
    );
    setAllQuestions(updatedAllQuestions);

    const updatedExamQuestions = questions.map((q) =>
      q.id === updatedQuestion.id ? updatedQuestion : q
    );
    setQuestions(updatedExamQuestions);

    if (currentSubject) {
      setAllQuestionsMap((prev) => ({
        ...prev,
        [currentSubject.id]: updatedAllQuestions,
      }));
      saveQuestions(currentSubject.id, updatedAllQuestions);
    }

    setEditingQuestion(null);
    setSelectedAnswers([]);
    setShowAnswer(false);
    setIsAnswerCorrect(null);
  };

  const handleQuestionsUpdate = (updatedQuestions: Question[]) => {
    if (!currentSubject) return;
    setAllQuestions(updatedQuestions);
    setAllQuestionsMap((prev) => ({
      ...prev,
      [currentSubject.id]: updatedQuestions,
    }));
    saveQuestions(currentSubject.id, updatedQuestions);
  };

  const handleResetQuestions = async () => {
    if (!currentSubject) return;
    if (
      window.confirm(
        "確定要重設題庫嗎？這將清除自訂題目並恢復預設題目，同時清空該科目的所有統計數據。"
      )
    ) {
      const defaultQuestions = await resetToDefaultQuestions(currentSubject.id);
      setAllQuestions(defaultQuestions);
      setAllQuestionsMap((prev) => ({
        ...prev,
        [currentSubject.id]: defaultQuestions,
      }));

      setQuestionStats((current) => {
        const allStats = current || {};
        const { [currentSubject.id]: _, ...rest } = allStats;
        return rest;
      });

      toast.success("題庫已重設為預設題目");
    }
  };

  const handleSubjectsUpdate = (updatedSubjects: Subject[]) => {
    setSubjects(updatedSubjects);
    saveSubjects(updatedSubjects);
  };

  const handleImportData = async (data: {
    subjects?: Subject[];
    questions?: Record<string, Question[]>;
    questionStats?: Record<string, QuestionStats[]>;
    examResults?: ExamResult[];
  }) => {
    if (data.subjects) {
      setSubjects(data.subjects);
      await saveSubjects(data.subjects);
    }
    if (data.questions) {
      setAllQuestionsMap(data.questions);
      for (const [subjectId, questionList] of Object.entries(data.questions)) {
        await saveQuestions(subjectId, questionList);
      }
      if (currentSubject && data.questions[currentSubject.id]) {
        setAllQuestions(data.questions[currentSubject.id]);
      }
    }
    if (data.questionStats) {
      setQuestionStats(() => data.questionStats || {});
    }
    if (data.examResults) {
      setExamResults(() => data.examResults || []);
    }
  };

  const handleClearAllData = () => {
    setQuestionStats({});
    setExamResults([]);
    toast.success("所有數據已清除");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-semibold">載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {examState === "subject-select" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
              <BookOpen weight="fill" className="text-primary" />
              考試系統
              <Badge variant="secondary" className="text-sm">
                多科目版
              </Badge>
            </h1>
            <p className="text-muted-foreground text-lg">
              請選擇要練習的科目
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => setExamState("settings")}
              >
                <Gear className="mr-2" />
                設定
              </Button>
              <Button
                variant="outline"
                onClick={() => setExamState("subject-manager")}
              >
                <Database className="mr-2" />
                科目管理
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((subject) => {
              const subjectExamResults = (examResults || []).filter(
                (r) => r.subjectId === subject.id
              );
              const latestResult = subjectExamResults[0];
              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary transition-colors h-full"
                    onClick={() => selectSubject(subject)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{subject.icon}</span>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{subject.name}</CardTitle>
                          <p className="text-muted-foreground text-sm">
                            {subject.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {latestResult && (
                        <div className="text-sm text-muted-foreground">
                          最近: {latestResult.score}分
                        </div>
                      )}
                      {subjectExamResults.length > 0 && (
                        <Badge variant="outline" className="mt-2">
                          已考 {subjectExamResults.length} 次
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {examState === "welcome" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {currentSubject?.icon} {currentSubject?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    題庫共有 <span className="font-bold text-foreground">{allQuestions.length}</span> 道題目
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>
                      {wrongQuestionsCount > 0
                        ? `您有 ${wrongQuestionsCount} 題需要加強`
                        : "目前沒有錯誤題目"}
                    </li>
                    <li>
                      {unattemptedQuestionsCount > 0
                        ? `尚有 ${unattemptedQuestionsCount} 題未作答`
                        : "所有題目都已經作答過"}
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">選擇題數</Label>
                  <RadioGroup
                    value={questionCount}
                    onValueChange={(value: QuestionCount) => setQuestionCount(value)}
                    className="grid grid-cols-2 gap-3"
                  >
                    {["10", "20", "30"].map((count) => (
                      <div
                        key={count}
                        className={cn(
                          "flex items-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-colors",
                          questionCount === count
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setQuestionCount(count as QuestionCount)}
                      >
                        <RadioGroupItem value={count} id={`count-${count}`} />
                        <Label htmlFor={`count-${count}`} className="cursor-pointer flex-1">
                          {count} 題
                        </Label>
                      </div>
                    ))}
                    <div
                      className={cn(
                        "flex items-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-colors",
                        questionCount === "all"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setQuestionCount("all")}
                    >
                      <RadioGroupItem value="all" id="count-all" />
                      <Label htmlFor="count-all" className="cursor-pointer flex-1">
                        全部題目 ({allQuestions.length} 題)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Button
                    size="lg"
                    onClick={() => startExam("random", questionCount)}
                    className="w-full"
                  >
                    <Play className="mr-2" weight="fill" />
                    開始考試
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => startExam("wrong")}
                      className="flex-1"
                      disabled={wrongQuestionsCount === 0}
                    >
                      <Warning className="mr-2" weight="fill" />
                      錯題復習
                      {wrongQuestionsCount > 0 && (
                        <Badge className="ml-2" variant="outline">
                          {wrongQuestionsCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => startExam("unattempted")}
                      className="flex-1"
                      disabled={unattemptedQuestionsCount === 0}
                    >
                      未作答題目
                      {unattemptedQuestionsCount > 0 && (
                        <Badge className="ml-2" variant="outline">
                          {unattemptedQuestionsCount}
                        </Badge>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => startExam("important")}
                      className="flex-1"
                      disabled={importantQuestionsCount === 0}
                    >
                      <Star className="mr-2" weight="fill" />
                      重點題目
                      {importantQuestionsCount > 0 && (
                        <Badge className="ml-2" variant="outline">
                          {importantQuestionsCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => startExam("frequently-wrong")}
                      className="flex-1"
                      disabled={frequentlyWrongQuestionsCount === 0}
                    >
                      <Fire className="mr-2" weight="fill" />
                      錯 2 次以上
                      {frequentlyWrongQuestionsCount > 0 && (
                        <Badge className="ml-2" variant="destructive">
                          {frequentlyWrongQuestionsCount}
                        </Badge>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setExamState("history")}
                      className="flex-1"
                    >
                      <ChartLine className="mr-2" />
                      歷史記錄
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setExamState("stats")}
                      className="flex-1"
                    >
                      <Database className="mr-2" />
                      答題統計
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setExamState("questions")}
                      className="flex-1"
                    >
                      <BookOpen className="mr-2" />
                      題庫管理
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleResetQuestions}
                      className="flex-1"
                    >
                      <ArrowCounterClockwise className="mr-2" />
                      重設題庫
                    </Button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={backToSubjectSelect}
                  className="w-full"
                >
                  <House className="mr-2" />
                  返回科目選擇
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ChartLine weight="fill" />
                  最近成績
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(examResults || [])
                  .filter((r) => r.subjectId === currentSubject?.id)
                  .slice(0, 3)
                  .map((result) => (
                    <div key={result.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(result.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{result.score}分</span>
                        <Badge variant={result.score >= 60 ? "default" : "destructive"}>
                          {result.correctAnswers}/{result.totalQuestions}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {examState === "exam" && currentQuestion && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`question-${currentQuestionIndex}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-3xl mx-auto"
          >
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          currentQuestion.type === "multiple"
                            ? "default"
                            : currentQuestion.type === "fill_in_the_blanks"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          currentQuestion.type === "multiple"
                            ? "bg-accent hover:bg-accent"
                            : ""
                        }
                      >
                        {currentQuestion.type === "multiple"
                          ? "多選"
                          : currentQuestion.type === "fill_in_the_blanks"
                          ? "填充"
                          : "單選"}
                      </Badge>
                      {currentQuestion.chapter && (
                        <Badge variant="outline">{currentQuestion.chapter}</Badge>
                      )}
                      {userAnswers.some(ua => ua.questionId === currentQuestion.id) && (
                        <Badge variant="secondary" className="bg-accent/20 text-accent">
                          已作答
                        </Badge>
                      )}
                      {examMode === "wrong" && (
                        <Badge variant="destructive">錯題復習</Badge>
                      )}
                      {examMode === "important" && (
                        <Badge className="bg-accent hover:bg-accent">重點題目</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleImportant(currentQuestion.id)}
                      >
                        <Star
                          weight={
                            currentSubjectStats.find((s) => s.questionId === currentQuestion.id)
                              ?.isImportant
                              ? "fill"
                              : "regular"
                          }
                          className="mr-1"
                        />
                        {currentSubjectStats.find((s) => s.questionId === currentQuestion.id)
                          ?.isImportant
                          ? "取消重點"
                          : "標記重點"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={editCurrentQuestion}
                        className="text-primary hover:text-primary"
                      >
                        <Gear className="mr-1" />
                        編輯題目
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={removeCurrentQuestion}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash className="mr-1" />
                        永久刪除
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQuestionNav(!showQuestionNav)}
                      >
                        <ListNumbers className="mr-1" />
                        題號
                      </Button>
                    </div>
                  </div>

                  {showQuestionNav && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                      {questions.map((q, index) => {
                        const isAnswered = userAnswers.some(
                          (ua) => ua.questionId === q.id
                        );
                        const isCurrent = currentQuestionIndex === index;
                        return (
                          <Button
                            key={index}
                            variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => jumpToQuestion(index)}
                            className={cn(
                              "w-12 relative",
                              isAnswered && !isCurrent && "border-accent border-2"
                            )}
                          >
                            {index + 1}
                            {isAnswered && !isCurrent && (
                              <CheckCircle
                                weight="fill"
                                className="absolute -top-1 -right-1 text-accent bg-background rounded-full"
                                size={14}
                              />
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      第 {currentQuestionIndex + 1} / {questions.length} 題
                      {userAnswers.length > 0 && (
                        <span className="ml-2 text-accent">
                          (已作答 {userAnswers.length} 題)
                        </span>
                      )}
                    </p>
                    {removedQuestionIds.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        已移除 {removedQuestionIds.length} 題
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold leading-relaxed">
                    {currentQuestion.question}
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentQuestion.type === "single" && (
                  <RadioGroup
                    value={selectedAnswers[0]}
                    onValueChange={(value) => handleAnswerSelect(value, false)}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedAnswers.includes(option.label);
                      const isCorrect = currentQuestion.correctAnswer.includes(option.label);
                      const shouldShowCorrect = showAnswer && isCorrect;

                      return (
                        <div
                          key={option.label}
                          className={cn(
                            "flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all",
                            !showAnswer && isSelected && "border-primary bg-primary/5",
                            !showAnswer && !isSelected && "border-border hover:border-primary/50",
                            showAnswer && isSelected && !isCorrect && "border-destructive bg-destructive/5",
                            shouldShowCorrect && "border-accent bg-accent/10"
                          )}
                          onClick={() => handleAnswerSelect(option.label, false)}
                        >
                          <RadioGroupItem
                            value={option.label}
                            id={option.label}
                            disabled={showAnswer}
                          />
                          <Label
                            htmlFor={option.label}
                            className="flex-1 cursor-pointer text-base"
                          >
                            <span className="font-semibold mr-2">{option.label}.</span>
                            {option.text}
                          </Label>
                          {shouldShowCorrect && (
                            <CheckCircle
                              weight="fill"
                              className="text-accent"
                              size={24}
                            />
                          )}
                          {showAnswer && isSelected && !isCorrect && (
                            <XCircle
                              weight="fill"
                              className="text-destructive"
                              size={24}
                            />
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}

                {currentQuestion.type === "multiple" && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedAnswers.includes(option.label);
                      const isCorrect = currentQuestion.correctAnswer.includes(option.label);
                      const shouldShowCorrect = showAnswer && isCorrect;

                      return (
                        <div
                          key={option.label}
                          className={cn(
                            "flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all",
                            !showAnswer && isSelected && "border-primary bg-primary/5",
                            !showAnswer && !isSelected && "border-border hover:border-primary/50",
                            showAnswer && isSelected && !isCorrect && "border-destructive bg-destructive/5",
                            shouldShowCorrect && "border-accent bg-accent/10"
                          )}
                          onClick={() => handleAnswerSelect(option.label, true)}
                        >
                          <Checkbox
                            id={option.label}
                            checked={isSelected}
                            onCheckedChange={() => handleAnswerSelect(option.label, true)}
                            disabled={showAnswer}
                          />
                          <Label
                            htmlFor={option.label}
                            className="flex-1 cursor-pointer text-base"
                          >
                            <span className="font-semibold mr-2">{option.label}.</span>
                            {option.text}
                          </Label>
                          {shouldShowCorrect && (
                            <CheckCircle
                              weight="fill"
                              className="text-accent"
                              size={24}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === "fill_in_the_blanks" && (
                  <div className="space-y-2">
                    <Label htmlFor="fill-answer">請輸入答案（不區分大小寫）</Label>
                    <Input
                      id="fill-answer"
                      placeholder="請輸入答案"
                      value={selectedAnswers[0] || ""}
                      onChange={(e) => setSelectedAnswers([e.target.value])}
                      disabled={showAnswer}
                      className={cn(
                        showAnswer && isAnswerCorrect && "border-accent",
                        showAnswer && !isAnswerCorrect && "border-destructive"
                      )}
                    />
                  </div>
                )}

                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-lg space-y-2",
                      isAnswerCorrect ? "bg-accent/10 border-2 border-accent" : "bg-destructive/10 border-2 border-destructive"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isAnswerCorrect ? (
                        <CheckCircle
                          weight="fill"
                          className="text-accent"
                          size={24}
                        />
                      ) : (
                        <XCircle
                          weight="fill"
                          className="text-destructive"
                          size={24}
                        />
                      )}
                      <span className="font-semibold">
                        {isAnswerCorrect ? "答對了！" : "答錯了"}
                      </span>
                    </div>
                    {!isAnswerCorrect && (
                      <div className="text-sm">
                        <span className="font-semibold">正確答案：</span>
                        <span className="text-accent font-semibold ml-2">
                          {currentQuestion.correctAnswer.join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="text-sm leading-relaxed">
                      <span className="font-semibold">解析：</span>
                      <span className="ml-2">{currentQuestion.explanation}</span>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  {!showAnswer ? (
                    <>
                      <Button
                        size="lg"
                        onClick={checkAnswer}
                        className="flex-1"
                        disabled={selectedAnswers.length === 0}
                      >
                        <BookOpen className="mr-2" />
                        提交答案
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={endExamEarly}
                      >
                        <StopCircle className="mr-2" />
                        結束考試
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={previousQuestion}
                        disabled={currentQuestionIndex === 0}
                      >
                        <CaretLeft className="mr-2" />
                        上一題
                      </Button>
                      <Button
                        size="lg"
                        onClick={nextQuestion}
                        className="flex-1"
                      >
                        {currentQuestionIndex < questions.length - 1
                          ? "下一題"
                          : "完成測驗"}
                        {currentQuestionIndex < questions.length - 1 && (
                          <CaretRight className="ml-2" />
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={endExamEarly}
                      >
                        <StopCircle className="mr-2" />
                        結束
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {examState === "result" && currentResult && (
        <AnimatePresence mode="wait">
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl text-center">測驗完成</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div
                    className={cn(
                      "text-6xl font-bold mb-2",
                      currentResult.score >= 80
                        ? "text-accent"
                        : currentResult.score >= 60
                        ? "text-primary"
                        : "text-destructive"
                    )}
                  >
                    {currentResult.score}
                  </div>
                  <p className="text-muted-foreground">分數</p>
                </div>

                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-foreground">
                      {currentResult.totalQuestions}
                    </div>
                    <div className="text-sm text-muted-foreground">總題數</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-accent">
                      {currentResult.correctAnswers}
                    </div>
                    <div className="text-sm text-muted-foreground">答對</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-destructive">
                      {currentResult.totalQuestions - currentResult.correctAnswers}
                    </div>
                    <div className="text-sm text-muted-foreground">答錯</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={backToSubjectSelect}
                    className="flex-1"
                  >
                    <House className="mr-2" />
                    返回首頁
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setExamState("welcome")}
                    className="flex-1"
                  >
                    再來一次
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>答題詳情</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {currentResult.answers.map((answer, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start gap-3">
                          {answer.isCorrect ? (
                            <CheckCircle
                              weight="fill"
                              className="text-accent flex-shrink-0 mt-1"
                              size={24}
                            />
                          ) : (
                            <XCircle
                              weight="fill"
                              className="text-destructive flex-shrink-0 mt-1"
                              size={24}
                            />
                          )}
                          <div className="flex-1 space-y-2">
                            <div className="font-semibold leading-relaxed">
                              {index + 1}. {answer.question}
                            </div>
                            <div className="flex gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  answer.questionType === "multiple"
                                    ? "bg-accent hover:bg-accent"
                                    : ""
                                }
                              >
                                {answer.questionType === "multiple"
                                  ? "多選"
                                  : answer.questionType === "fill_in_the_blanks"
                                  ? "填充"
                                  : "單選"}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div
                                className={cn(
                                  "p-2 rounded",
                                  answer.isCorrect
                                    ? "text-accent"
                                    : "text-destructive"
                                )}
                              >
                                <span className="font-semibold">
                                  {answer.isCorrect ? "✓" : "✗"} 您的答案：
                                </span>
                                <Badge
                                  variant={answer.isCorrect ? "default" : "destructive"}
                                  className={
                                    answer.isCorrect
                                      ? "bg-accent hover:bg-accent ml-2"
                                      : "ml-2"
                                  }
                                >
                                  {answer.selectedAnswer.length > 0
                                    ? answer.selectedAnswer.join(", ")
                                    : "未作答"}
                                </Badge>
                              </div>
                              {!answer.isCorrect && (
                                <div className="p-2 rounded text-accent">
                                  <span className="font-semibold">正確答案：</span>
                                  <Badge className="bg-accent hover:bg-accent ml-2">
                                    {answer.correctAnswer.join(", ")}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="p-3 rounded-lg bg-muted text-sm">
                              <span className="font-semibold">解析：</span>
                              <span className="ml-2 text-muted-foreground">
                                {answer.explanation}
                              </span>
                            </div>
                          </div>
                        </div>
                        {index < currentResult.answers.length - 1 && (
                          <div className="border-b my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {examState === "history" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="history"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <ChartLine weight="fill" />
                    歷史記錄
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => setExamState("welcome")}
                  >
                    返回
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!(examResults || []).filter((r) => r.subjectId === currentSubject?.id).length ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="text-muted-foreground">尚無考試記錄</div>
                    <Button onClick={() => setExamState("welcome")}>
                      <Play className="mr-2" weight="fill" />
                      開始第一次考試
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {(examResults || [])
                        .filter((r) => r.subjectId === currentSubject?.id)
                        .map((result, index) => (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-lg border-2 border-border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-lg">
                                    {result.score}分
                                  </span>
                                  <Badge
                                    variant={
                                      result.score >= 80
                                        ? "default"
                                        : result.score >= 60
                                        ? "secondary"
                                        : "destructive"
                                    }
                                    className={
                                      result.score >= 80
                                        ? "bg-accent hover:bg-accent"
                                        : ""
                                    }
                                  >
                                    {result.score >= 80
                                      ? "優秀"
                                      : result.score >= 60
                                      ? "及格"
                                      : "不及格"}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(result.date).toLocaleString("zh-TW", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-sm text-muted-foreground">
                                  答對 {result.correctAnswers} /{" "}
                                  {result.totalQuestions} 題
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {examState === "stats" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="stats"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <ChartLine weight="fill" />
                    答題統計
                  </CardTitle>
                  <Button variant="outline" onClick={() => setExamState("welcome")}>
                    返回
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!currentSubjectStats || currentSubjectStats.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="text-muted-foreground">尚無答題統計</div>
                    <Button onClick={() => setExamState("welcome")}>
                      <Play className="mr-2" weight="fill" />
                      開始答題
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {currentSubjectStats
                        .map((stat) => {
                          const question = allQuestions.find((q) => q.id === stat.questionId);
                          if (!question) return null;

                          const total = stat.correctCount + stat.incorrectCount;
                          const accuracy =
                            total > 0
                              ? Math.round((stat.correctCount / total) * 100)
                              : 0;

                          return (
                            <motion.div
                              key={stat.questionId}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: currentSubjectStats.indexOf(stat) * 0.02 }}
                              className="p-4 rounded-lg border-2 border-border space-y-3"
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-semibold">{question.question}</span>
                                      <Badge
                                        variant={
                                          question.type === "multiple"
                                            ? "default"
                                            : question.type === "fill_in_the_blanks"
                                            ? "secondary"
                                            : "outline"
                                        }
                                        className={
                                          question.type === "multiple"
                                            ? "bg-accent hover:bg-accent"
                                            : ""
                                        }
                                      >
                                        {question.type === "multiple"
                                          ? "多選"
                                          : question.type === "fill_in_the_blanks"
                                          ? "填充"
                                          : "單選"}
                                      </Badge>
                                      {stat.isImportant && (
                                        <Badge className="bg-accent hover:bg-accent">
                                          <Star weight="fill" className="mr-1" size={14} />
                                          重點
                                        </Badge>
                                      )}
                                    </div>
                                    {stat.lastAttempt && (
                                      <div className="text-xs text-muted-foreground">
                                        最後作答：
                                        {new Date(stat.lastAttempt).toLocaleString("zh-TW")}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right space-y-1">
                                    <div
                                      className={cn(
                                        "text-2xl font-bold",
                                        accuracy >= 80
                                          ? "text-accent"
                                          : accuracy >= 60
                                          ? "text-primary"
                                          : "text-destructive"
                                      )}
                                    >
                                      {accuracy}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      答題準確率
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle
                                      weight="fill"
                                      className="text-accent"
                                      size={16}
                                    />
                                    <span className="text-muted-foreground">
                                      答對 {stat.correctCount} 次
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <XCircle
                                      weight="fill"
                                      className="text-destructive"
                                      size={16}
                                    />
                                    <span className="text-muted-foreground">
                                      答錯 {stat.incorrectCount} 次
                                    </span>
                                  </div>
                                </div>
                                <Progress
                                  value={accuracy}
                                  className="h-2"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleImportant(stat.questionId)}
                                  className="flex-1"
                                >
                                  <Star
                                    weight={stat.isImportant ? "fill" : "regular"}
                                    className="mr-1"
                                    size={16}
                                  />
                                  {stat.isImportant ? "取消重點" : "標記重點"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFromStats(stat.questionId)}
                                  className="flex-1"
                                >
                                  <Trash size={16} className="mr-2" />
                                  移除統計
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })
                        .filter(Boolean)}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {examState === "questions" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="questions"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-6xl mx-auto"
          >
            <QuestionManager
              questions={allQuestions}
              onQuestionsUpdate={handleQuestionsUpdate}
              onClose={() => setExamState("welcome")}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {examState === "subject-manager" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="subject-manager"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto"
          >
            <SubjectManager
              subjects={subjects}
              onSubjectsUpdate={handleSubjectsUpdate}
              onClose={() => setExamState("subject-select")}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {examState === "settings" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="settings"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto"
          >
            <Settings
              subjects={subjects}
              allQuestions={allQuestionsMap}
              questionStats={questionStats || {}}
              examResults={examResults || []}
              onImportData={handleImportData}
              onClearAllData={handleClearAllData}
              onClose={() => setExamState("subject-select")}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          onSave={handleQuestionSave}
          onCancel={() => setEditingQuestion(null)}
        />
      )}
    </div>
  );
}

export default App;
