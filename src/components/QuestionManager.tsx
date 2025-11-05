import { useState, useRef } from "react";
import { Question } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash,
  FloppyDisk,
  X,
  PencilSimple,
  Warning,
  DownloadSimple,
  UploadSimple,
  FileArrowDown,
  FileArrowUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QuestionManagerProps {
  questions: Question[];
  onQuestionsUpdate: (questions: Question[]) => void;
  onClose: () => void;
}

interface ImportStats {
  total: number;
  newCount: number;
  updateCount: number;
  uploadedQuestions: Question[];
}

export function QuestionManager({
  questions,
  onQuestionsUpdate,
  onClose,
}: QuestionManagerProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    question: "",
    type: "single" as "single" | "multiple" | "fill_in_the_blanks",
    options: [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ],
    correctAnswer: [] as string[],
    explanation: "",
    chapter: "",
  });
  const [jsonText, setJsonText] = useState("");
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const startCreating = () => {
    setFormData({
      question: "",
      type: "single",
      options: [
        { label: "A", text: "" },
        { label: "B", text: "" },
        { label: "C", text: "" },
        { label: "D", text: "" },
      ],
      correctAnswer: [],
      explanation: "",
      chapter: "",
    });
    setEditingQuestion(null);
    setIsCreating(true);
  };

  const startEditing = (question: Question) => {
    setFormData({
      question: question.question,
      type: question.type,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      chapter: question.chapter || "",
    });
    setEditingQuestion(question);
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setIsCreating(false);
    setEditingQuestion(null);
  };

  const handleSave = () => {
    if (!formData.question.trim()) {
      toast.error("請輸入題目內容");
      return;
    }

    if (formData.type !== "fill_in_the_blanks" && formData.options.some((opt) => !opt.text.trim())) {
      toast.error("請填寫所有選項內容");
      return;
    }

    if (formData.correctAnswer.length === 0) {
      toast.error("請選擇正確答案");
      return;
    }

    if (!formData.explanation.trim()) {
      toast.error("請輸入解析內容");
      return;
    }

    if (formData.type === "single" && formData.correctAnswer.length > 1) {
      toast.error("單選題只能選擇一個答案");
      return;
    }

    const newQuestion: Question = {
      id: editingQuestion?.id || Date.now(),
      question: formData.question.trim(),
      type: formData.type,
      options: formData.type === "fill_in_the_blanks" ? [] : formData.options,
      correctAnswer: formData.correctAnswer,
      explanation: formData.explanation.trim(),
      chapter: formData.chapter.trim() || undefined,
    };

    if (editingQuestion) {
      const updatedQuestions = questions.map((q) =>
        q.id === editingQuestion.id ? newQuestion : q
      );
      onQuestionsUpdate(updatedQuestions);
      toast.success("題目已更新");
    } else {
      onQuestionsUpdate([...questions, newQuestion]);
      toast.success("題目已新增");
    }

    setIsCreating(false);
    setEditingQuestion(null);
  };

  const handleDelete = (questionId: number) => {
    if (
      window.confirm("確定要刪除此題目嗎？此操作無法復原，且會影響已有的統計數據。")
    ) {
      const updatedQuestions = questions.filter((q) => q.id !== questionId);
      onQuestionsUpdate(updatedQuestions);
      toast.success("題目已刪除");
    }
  };

  const handleCorrectAnswerToggle = (label: string) => {
    if (formData.type === "single") {
      setFormData({ ...formData, correctAnswer: [label] });
    } else {
      const newAnswers = formData.correctAnswer.includes(label)
        ? formData.correctAnswer.filter((a) => a !== label)
        : [...formData.correctAnswer, label].sort();
      setFormData({ ...formData, correctAnswer: newAnswers });
    }
  };

  const handleFillInAnswer = (text: string) => {
    setFormData({ ...formData, correctAnswer: [text] });
  };

  const addOption = () => {
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const currentLabels = formData.options.map((o) => o.label);
    const nextLabel = labels.find((l) => !currentLabels.includes(l));
    if (nextLabel) {
      setFormData({
        ...formData,
        options: [...formData.options, { label: nextLabel, text: "" }],
      });
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast.error("至少需要保留兩個選項");
      return;
    }
    const removedLabel = formData.options[index].label;
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
      correctAnswer: formData.correctAnswer.filter((a) => a !== removedLabel),
    });
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], text };
    setFormData({ ...formData, options: newOptions });
  };

  const downloadQuestions = () => {
    try {
      const dataStr = JSON.stringify(questions, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `questions_${new Date().toISOString().split("T")[0]}.json`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success("題庫已下載");
    } catch (error) {
      console.error("下載失敗：", error);
      toast.error("下載失敗，請稍後再試");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("請選擇 JSON 檔案");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const uploadedQuestions = JSON.parse(content) as Question[];

        if (!Array.isArray(uploadedQuestions)) {
          toast.error("❌ 檔案格式錯誤：內容必須是陣列");
          return;
        }

        for (let i = 0; i < uploadedQuestions.length; i++) {
          const q = uploadedQuestions[i];
          if (!q.id) {
            toast.error(`❌ 第 ${i + 1} 題缺少 id 欄位`);
            return;
          }
          if (!q.question) {
            toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 question 欄位`);
            return;
          }
          if (!q.type) {
            toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 type 欄位`);
            return;
          }
          if (!q.correctAnswer || !Array.isArray(q.correctAnswer)) {
            toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 correctAnswer 陣列`);
            return;
          }
          if (!q.explanation) {
            toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 explanation 欄位`);
            return;
          }
        }

        const existingIds = new Set(questions.map(q => q.id));
        const newCount = uploadedQuestions.filter(q => !existingIds.has(q.id)).length;
        const updateCount = uploadedQuestions.filter(q => existingIds.has(q.id)).length;

        setImportStats({
          total: uploadedQuestions.length,
          newCount,
          updateCount,
          uploadedQuestions,
        });

        toast.success(`✅ 驗證成功！共 ${uploadedQuestions.length} 題（新增 ${newCount} 題，更新 ${updateCount} 題）`);
        setUploadDialogOpen(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知錯誤";
        toast.error(`❌ JSON 解析失敗\n\n檔案：${file.name}\n錯誤：${errorMessage}`, {
          duration: 8000,
        });
        console.error("JSON 解析錯誤詳情：", error);
      }
    };
    reader.onerror = () => {
      toast.error(`❌ 檔案讀取失敗：${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleBatchReset = () => {
    if (!importStats) return;
    onQuestionsUpdate(importStats.uploadedQuestions);
    toast.success(`已完全重置題庫，共 ${importStats.uploadedQuestions.length} 題`);
    setUploadDialogOpen(false);
    setImportStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleIncrementalAdd = () => {
    if (!importStats) return;
    
    const existingIds = new Set(questions.map(q => q.id));
    const newQuestions: Question[] = [];
    const updatedQuestions: Question[] = [];

    for (const q of importStats.uploadedQuestions) {
      if (existingIds.has(q.id)) {
        updatedQuestions.push(q);
      } else {
        newQuestions.push(q);
      }
    }

    const mergedQuestions = questions.map(q => {
      const updated = updatedQuestions.find(uq => uq.id === q.id);
      return updated || q;
    }).concat(newQuestions);

    onQuestionsUpdate(mergedQuestions);
    toast.success(
      `已更新題庫：新增 ${newQuestions.length} 題，更新 ${updatedQuestions.length} 題`
    );
    setUploadDialogOpen(false);
    setImportStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleIncrementalAddWithNewIds = () => {
    if (!importStats) return;
    
    const existingIds = new Set(questions.map(q => q.id));
    const newQuestions: Question[] = [];
    const questionsToAddWithNewIds: Question[] = [];

    for (const q of importStats.uploadedQuestions) {
      if (existingIds.has(q.id)) {
        let newId = Date.now() + Math.floor(Math.random() * 1000000);
        while (existingIds.has(newId)) {
          newId = Date.now() + Math.floor(Math.random() * 1000000);
        }
        existingIds.add(newId);
        questionsToAddWithNewIds.push({
          ...q,
          id: newId,
        });
      } else {
        newQuestions.push(q);
      }
    }

    const mergedQuestions = [...questions, ...newQuestions, ...questionsToAddWithNewIds];

    onQuestionsUpdate(mergedQuestions);
    toast.success(
      `已新增題庫：新增 ${newQuestions.length + questionsToAddWithNewIds.length} 題（含 ${questionsToAddWithNewIds.length} 題重新生成 ID）`
    );
    setUploadDialogOpen(false);
    setImportStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleJsonTextUpload = () => {
    if (!jsonText.trim()) {
      toast.error("請輸入 JSON 內容");
      return;
    }

    try {
      const uploadedQuestions = JSON.parse(jsonText) as Question[];

      if (!Array.isArray(uploadedQuestions)) {
        toast.error("❌ 格式錯誤：內容必須是陣列\n\n正確格式應為：[{...}, {...}]");
        return;
      }

      for (let i = 0; i < uploadedQuestions.length; i++) {
        const q = uploadedQuestions[i];
        if (!q.id) {
          toast.error(`❌ 第 ${i + 1} 題缺少 id 欄位`);
          return;
        }
        if (!q.question) {
          toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 question 欄位`);
          return;
        }
        if (!q.type) {
          toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 type 欄位`);
          return;
        }
        if (!["single", "multiple", "fill_in_the_blanks"].includes(q.type)) {
          toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) type 必須是 "single"、"multiple" 或 "fill_in_the_blanks"`);
          return;
        }
        if (q.type !== "fill_in_the_blanks" && (!q.options || !Array.isArray(q.options) || q.options.length === 0)) {
          toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 選擇題必須包含 options 陣列`);
          return;
        }
        if (!q.correctAnswer || !Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
          toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 correctAnswer 陣列`);
          return;
        }
        if (!q.explanation) {
          toast.error(`❌ 第 ${i + 1} 題 (id: ${q.id}) 缺少 explanation 欄位`);
          return;
        }
      }

      const existingIds = new Set(questions.map(q => q.id));
      const newCount = uploadedQuestions.filter(q => !existingIds.has(q.id)).length;
      const updateCount = uploadedQuestions.filter(q => existingIds.has(q.id)).length;

      setImportStats({
        total: uploadedQuestions.length,
        newCount,
        updateCount,
        uploadedQuestions,
      });

      toast.success(`✅ 驗證成功！共 ${uploadedQuestions.length} 題（新增 ${newCount} 題，更新 ${updateCount} 題）`);
      setUploadDialogOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知錯誤";
      toast.error(`❌ JSON 解析失敗\n\n錯誤訊息：${errorMessage}\n\n請檢查：\n1. JSON 格式是否正確\n2. 是否缺少逗號或括號\n3. 字串是否用雙引號包圍`, {
        duration: 8000,
      });
      console.error("JSON 解析錯誤詳情：", error);
    }
  };

  const handleJsonBatchReset = () => {
    if (!importStats) return;
    onQuestionsUpdate(importStats.uploadedQuestions);
    toast.success(`已完全重置題庫，共 ${importStats.uploadedQuestions.length} 題`);
    setUploadDialogOpen(false);
    setJsonDialogOpen(false);
    setJsonText("");
    setImportStats(null);
  };

  const handleJsonIncrementalAdd = () => {
    if (!importStats) return;
    
    const existingIds = new Set(questions.map(q => q.id));
    const newQuestions: Question[] = [];
    const updatedQuestions: Question[] = [];

    for (const q of importStats.uploadedQuestions) {
      if (existingIds.has(q.id)) {
        updatedQuestions.push(q);
      } else {
        newQuestions.push(q);
      }
    }

    const mergedQuestions = questions.map(q => {
      const updated = updatedQuestions.find(uq => uq.id === q.id);
      return updated || q;
    }).concat(newQuestions);

    onQuestionsUpdate(mergedQuestions);
    toast.success(
      `已更新題庫：新增 ${newQuestions.length} 題，更新 ${updatedQuestions.length} 題`
    );
    setUploadDialogOpen(false);
    setJsonDialogOpen(false);
    setJsonText("");
    setImportStats(null);
  };

  const handleJsonIncrementalAddWithNewIds = () => {
    if (!importStats) return;
    
    const existingIds = new Set(questions.map(q => q.id));
    const newQuestions: Question[] = [];
    const questionsToAddWithNewIds: Question[] = [];

    for (const q of importStats.uploadedQuestions) {
      if (existingIds.has(q.id)) {
        let newId = Date.now() + Math.floor(Math.random() * 1000000);
        while (existingIds.has(newId)) {
          newId = Date.now() + Math.floor(Math.random() * 1000000);
        }
        existingIds.add(newId);
        questionsToAddWithNewIds.push({
          ...q,
          id: newId,
        });
      } else {
        newQuestions.push(q);
      }
    }

    const mergedQuestions = [...questions, ...newQuestions, ...questionsToAddWithNewIds];

    onQuestionsUpdate(mergedQuestions);
    toast.success(
      `已新增題庫：新增 ${newQuestions.length + questionsToAddWithNewIds.length} 題（含 ${questionsToAddWithNewIds.length} 題重新生成 ID）`
    );
    setUploadDialogOpen(false);
    setJsonDialogOpen(false);
    setJsonText("");
    setImportStats(null);
  };

  if (isCreating) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {editingQuestion ? "編輯題目" : "新增題目"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={cancelEditing}>
              <X weight="bold" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="question">題目</Label>
                <Textarea
                  id="question"
                  placeholder="請輸入題目內容"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>題型</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value: "single" | "multiple" | "fill_in_the_blanks") => {
                    setFormData({
                      ...formData,
                      type: value,
                      correctAnswer: [],
                    });
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single">單選題</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multiple" id="multiple" />
                    <Label htmlFor="multiple">多選題</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fill_in_the_blanks" id="fill_in_the_blanks" />
                    <Label htmlFor="fill_in_the_blanks">填充題</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter">章節 (選填)</Label>
                <Input
                  id="chapter"
                  placeholder="例如：第一章、Unit 1"
                  value={formData.chapter}
                  onChange={(e) =>
                    setFormData({ ...formData, chapter: e.target.value })
                  }
                />
              </div>

              {formData.type !== "fill_in_the_blanks" && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>選項</Label>
                      {formData.options.length < 8 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addOption}
                        >
                          <Plus className="mr-1" size={16} />
                          新增選項
                        </Button>
                      )}
                    </div>
                    {formData.options.map((option, index) => (
                      <div key={option.label} className="flex gap-2">
                        <div className="flex items-center justify-center w-8 h-10 font-bold text-muted-foreground">
                          {option.label}.
                        </div>
                        <Input
                          placeholder={`選項 ${option.label}`}
                          value={option.text}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1"
                        />
                        {formData.options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(index)}
                          >
                            <Trash size={18} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>正確答案 {formData.type === "multiple" && "(可多選)"}</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.options.map((option) => (
                        <Badge
                          key={option.label}
                          variant={
                            formData.correctAnswer.includes(option.label)
                              ? "default"
                              : "outline"
                          }
                          className={cn(
                            "cursor-pointer select-none px-4 py-2 text-base",
                            formData.correctAnswer.includes(option.label) &&
                              "bg-accent hover:bg-accent"
                          )}
                          onClick={() => handleCorrectAnswerToggle(option.label)}
                        >
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                    {formData.correctAnswer.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        已選擇：{formData.correctAnswer.join(", ")}
                      </p>
                    )}
                  </div>
                </>
              )}

              {formData.type === "fill_in_the_blanks" && (
                <div className="space-y-2">
                  <Label htmlFor="fill-answer">正確答案 (不區分大小寫)</Label>
                  <Input
                    id="fill-answer"
                    placeholder="請輸入正確答案"
                    value={formData.correctAnswer[0] || ""}
                    onChange={(e) => handleFillInAnswer(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    填充題答題時不區分大小寫，多個答案請用英文逗號分隔（例如：答案1,答案2）
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="explanation">解析</Label>
                <Textarea
                  id="explanation"
                  placeholder="請輸入解析內容"
                  value={formData.explanation}
                  onChange={(e) =>
                    setFormData({ ...formData, explanation: e.target.value })
                  }
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button size="lg" onClick={handleSave} className="flex-1">
                  <FloppyDisk className="mr-2" weight="fill" />
                  儲存
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">題庫管理</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadQuestions}>
              <DownloadSimple className="mr-2" weight="fill" />
              下載題庫
            </Button>
            <Button
              variant="outline"
              onClick={() => setJsonDialogOpen(true)}
            >
              <FileArrowUp className="mr-2" weight="fill" />
              貼上 JSON
            </Button>
            <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setUploadDialogOpen(false);
                setImportStats(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadSimple className="mr-2" weight="fill" />
                  上傳檔案
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>上傳題庫 JSON</DialogTitle>
                  <DialogDescription>
                    {importStats && `共 ${importStats.total} 題（新增 ${importStats.newCount} 題，更新 ${importStats.updateCount} 題）`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {importStats && (
                    <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
                      <div className="space-y-2">
                        <p className="font-semibold text-lg">匯入統計</p>
                        <div className="space-y-1 text-sm">
                          <p>• 總題數：<span className="font-bold">{importStats.total}</span> 題</p>
                          <p>• 新增題目：<span className="font-bold text-accent">{importStats.newCount}</span> 題</p>
                          <p>• 更新題目：<span className="font-bold text-primary">{importStats.updateCount}</span> 題</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <div className="flex items-start gap-2">
                      <FileArrowDown className="text-primary flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">完全重置</p>
                        <p className="text-xs text-muted-foreground">
                          清空現有題庫，使用上傳的題目完全替換
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <div className="flex items-start gap-2">
                      <FileArrowUp className="text-accent flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">差異新增（更新模式）</p>
                        <p className="text-xs text-muted-foreground">
                          保留現有題目，根據 ID 更新已存在的題目，新增不存在的題目
                        </p>
                      </div>
                    </div>
                  </div>
                  {importStats && importStats.updateCount > 0 && (
                    <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent space-y-2">
                      <div className="flex items-start gap-2">
                        <Plus className="text-accent flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">差異新增（生成新 ID）</p>
                          <p className="text-xs text-muted-foreground">
                            保留現有題目，將相同 ID 的 {importStats.updateCount} 題重新生成 ID 後新增，而非更新原有題目
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={handleBatchReset}
                        className="flex-1"
                      >
                        <FileArrowDown className="mr-2" weight="fill" />
                        完全重置
                      </Button>
                      <Button
                        onClick={handleIncrementalAdd}
                        className="flex-1 bg-accent hover:bg-accent"
                      >
                        <FileArrowUp className="mr-2" weight="fill" />
                        差異新增（更新）
                      </Button>
                    </div>
                    {importStats && importStats.updateCount > 0 && (
                      <Button
                        onClick={handleIncrementalAddWithNewIds}
                        className="w-full bg-accent hover:bg-accent"
                        variant="outline"
                      >
                        <Plus className="mr-2" weight="fill" />
                        差異新增（生成新 ID）
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>貼上 JSON 文字</DialogTitle>
                  <DialogDescription>
                    直接貼上題庫 JSON 內容進行批量上傳
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 pb-4 border-b">
                  <Button
                    onClick={handleJsonTextUpload}
                    className="flex-1"
                  >
                    驗證並上傳
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setJsonDialogOpen(false);
                      setJsonText("");
                    }}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </div>
                <div className="flex-1 min-h-0 space-y-2">
                  <Label htmlFor="json-text">JSON 內容</Label>
                  <ScrollArea className="h-[450px] w-full rounded-md border">
                    <Textarea
                      id="json-text"
                      placeholder='請貼上 JSON 陣列，例如：[{"id": 1, "question": "...", "type": "single", ...}]'
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      className="min-h-[450px] font-mono text-xs border-0 focus-visible:ring-0 resize-none"
                    />
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={uploadDialogOpen && jsonText.length > 0} onOpenChange={(open) => {
              if (!open) {
                setUploadDialogOpen(false);
                setJsonText("");
                setImportStats(null);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>選擇上傳方式</DialogTitle>
                  <DialogDescription>
                    {importStats && `共 ${importStats.total} 題（新增 ${importStats.newCount} 題，更新 ${importStats.updateCount} 題）`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {importStats && (
                    <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
                      <div className="space-y-2">
                        <p className="font-semibold text-lg">匯入統計</p>
                        <div className="space-y-1 text-sm">
                          <p>• 總題數：<span className="font-bold">{importStats.total}</span> 題</p>
                          <p>• 新增題目：<span className="font-bold text-accent">{importStats.newCount}</span> 題</p>
                          <p>• 更新題目：<span className="font-bold text-primary">{importStats.updateCount}</span> 題</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <div className="flex items-start gap-2">
                      <FileArrowDown className="text-primary flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">完全重置</p>
                        <p className="text-xs text-muted-foreground">
                          清空現有題庫，使用上傳的題目完全替換
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <div className="flex items-start gap-2">
                      <FileArrowUp className="text-accent flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">差異新增（更新模式）</p>
                        <p className="text-xs text-muted-foreground">
                          保留現有題目，根據 ID 更新已存在的題目，新增不存在的題目
                        </p>
                      </div>
                    </div>
                  </div>
                  {importStats && importStats.updateCount > 0 && (
                    <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent space-y-2">
                      <div className="flex items-start gap-2">
                        <Plus className="text-accent flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">差異新增（生成新 ID）</p>
                          <p className="text-xs text-muted-foreground">
                            保留現有題目，將相同 ID 的 {importStats.updateCount} 題重新生成 ID 後新增，而非更新原有題目
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={handleJsonBatchReset}
                        className="flex-1"
                      >
                        <FileArrowDown className="mr-2" weight="fill" />
                        完全重置
                      </Button>
                      <Button
                        onClick={handleJsonIncrementalAdd}
                        className="flex-1 bg-accent hover:bg-accent"
                      >
                        <FileArrowUp className="mr-2" weight="fill" />
                        差異新增（更新）
                      </Button>
                    </div>
                    {importStats && importStats.updateCount > 0 && (
                      <Button
                        onClick={handleJsonIncrementalAddWithNewIds}
                        className="w-full bg-accent hover:bg-accent"
                        variant="outline"
                      >
                        <Plus className="mr-2" weight="fill" />
                        差異新增（生成新 ID）
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button onClick={startCreating}>
              <Plus className="mr-2" weight="fill" />
              新增題目
            </Button>
            <Button variant="outline" onClick={onClose}>
              返回
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 rounded-lg bg-muted/50 flex items-start gap-3">
          <Warning className="text-primary flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-foreground">題庫管理說明</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 所有題目自動儲存在瀏覽器本地儲存空間，關閉網頁也不會遺失</li>
              <li>• 可下載題庫為 JSON 檔案進行備份或分享</li>
              <li>• 支援「貼上 JSON」直接在網頁複製貼上 JSON 文字上傳</li>
              <li>• 上傳 JSON 可選擇「完全重置」或「差異新增」模式</li>
              <li>• 差異新增：根據題目 ID 判斷，更新已存在的題目，新增不存在的題目</li>
              <li>• 支援單選題、多選題、填充題（不區分大小寫）</li>
            </ul>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            共有 <span className="font-bold text-foreground">{questions.length}</span> 道題目
          </p>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="p-4 rounded-lg border-2 border-border space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{index + 1}
                      </span>
                      <Badge
                        variant={question.type === "multiple" ? "default" : question.type === "fill_in_the_blanks" ? "secondary" : "outline"}
                        className={
                          question.type === "multiple" ? "bg-accent hover:bg-accent" : ""
                        }
                      >
                        {question.type === "multiple" ? "多選" : question.type === "fill_in_the_blanks" ? "填充" : "單選"}
                      </Badge>
                      {question.chapter && (
                        <Badge variant="outline" className="text-xs">
                          {question.chapter}
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-foreground leading-relaxed">
                      {question.question}
                    </p>
                    {question.type !== "fill_in_the_blanks" && (
                      <div className="space-y-1">
                        {question.options.map((option) => (
                          <p
                            key={option.label}
                            className={cn(
                              "text-sm",
                              question.correctAnswer.includes(option.label)
                                ? "text-accent font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            <span className="font-mono font-bold">{option.label}.</span>{" "}
                            {option.text}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-sm">
                      <span className="font-semibold">正確答案：</span>
                      <span className="text-accent font-semibold">
                        {question.correctAnswer.join(", ")}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => startEditing(question)}
                    >
                      <PencilSimple weight="fill" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(question.id)}
                    >
                      <Trash weight="fill" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
