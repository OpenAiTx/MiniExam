declare global {
  interface Window {
    spark: {
      kv: {
        get: <T>(key: string) => Promise<T | undefined>;
        set: <T>(key: string, value: T) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
    };
  }
}

export interface Question {
  id: number;
  question: string;
  type: "single" | "multiple" | "fill_in_the_blanks";
  options: {
    label: string;
    text: string;
  }[];
  correctAnswer: string[];
  explanation: string;
  chapter?: string;
}

export interface QuestionStats {
  questionId: number;
  correctCount: number;
  incorrectCount: number;
  lastAttempt?: number;
  isImportant?: boolean;
}

export interface ExamResult {
  id: string;
  date: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  subjectId: string;
  answers: {
    questionId: number;
    question: string;
    questionType: "single" | "multiple" | "fill_in_the_blanks";
    selectedAnswer: string[];
    correctAnswer: string[];
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const SUBJECTS: Subject[] = [
  {
    id: "network",
    name: "網路基礎知識",
    description: "電腦網路基礎概念與通訊協定",
    icon: "🌐"
  },
  {
    id: "rfid",
    name: "RFID 技術",
    description: "無線射頻識別技術與應用",
    icon: "📡"
  },
  {
    id: "programming",
    name: "程式設計",
    description: "程式設計基礎與演算法",
    icon: "💻"
  },
  {
    id: "system",
    name: "系統開發",
    description: "系統分析與軟體開發",
    icon: "🛠️"
  }
];

export async function loadSubjects(): Promise<Subject[]> {
  try {
    const customSubjects = await window.spark.kv.get<Subject[]>('custom-subjects');
    if (customSubjects && customSubjects.length > 0) {
      return customSubjects;
    }
  } catch (error) {
    console.error('Error loading custom subjects:', error);
  }
  return SUBJECTS;
}

export async function saveSubjects(subjects: Subject[]): Promise<void> {
  await window.spark.kv.set('custom-subjects', subjects);
}

function getQuestionsKVKey(subjectId: string): string {
  return `custom-questions-${subjectId}`;
}

function getDefaultQuestionsPath(subjectId: string): string {
  return `/questions-${subjectId}.json`;
}

export async function loadQuestions(subjectId: string): Promise<Question[]> {
  try {
    const customQuestions = await window.spark.kv.get<Question[]>(getQuestionsKVKey(subjectId));
    if (customQuestions && customQuestions.length > 0) {
      return customQuestions;
    }
  } catch (error) {
    console.error('Error loading custom questions:', error);
  }
  
  try {
    const response = await fetch(getDefaultQuestionsPath(subjectId));
    if (!response.ok) {
      throw new Error('Failed to load questions');
    }
    const defaultQuestions = await response.json();
    return defaultQuestions;
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
}

export async function saveQuestions(subjectId: string, questions: Question[]): Promise<void> {
  await window.spark.kv.set(getQuestionsKVKey(subjectId), questions);
}

export async function resetToDefaultQuestions(subjectId: string): Promise<Question[]> {
  try {
    await window.spark.kv.delete(getQuestionsKVKey(subjectId));
    const response = await fetch(getDefaultQuestionsPath(subjectId));
    if (!response.ok) {
      throw new Error('Failed to load default questions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error resetting questions:', error);
    return [];
  }
}

export function getRandomQuestions(count: number, questions: Question[]): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length));
}

export function getWrongQuestions(stats: QuestionStats[], questions: Question[]): Question[] {
  const wrongQuestionIds = stats
    .filter(s => s.incorrectCount > 0)
    .map(s => s.questionId);
  
  return questions.filter(q => wrongQuestionIds.includes(q.id));
}

export function getUnattemptedQuestions(stats: QuestionStats[], questions: Question[]): Question[] {
  const attemptedQuestionIds = stats.map(s => s.questionId);
  return questions.filter(q => !attemptedQuestionIds.includes(q.id));
}

export function getImportantQuestions(stats: QuestionStats[], questions: Question[]): Question[] {
  const importantQuestionIds = stats
    .filter(s => s.isImportant)
    .map(s => s.questionId);
  
  return questions.filter(q => importantQuestionIds.includes(q.id));
}

export function getFrequentlyWrongQuestions(stats: QuestionStats[], questions: Question[]): Question[] {
  const wrongQuestionIds = stats
    .filter(s => s.incorrectCount >= 2)
    .map(s => s.questionId);
  
  return questions.filter(q => wrongQuestionIds.includes(q.id));
}
