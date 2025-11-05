import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Question } from "@/lib/questions";
import { X, Plus, Trash, Check } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuestionEditorProps {
  question: Question;
  onSave: (updatedQuestion: Question) => void;
  onCancel: () => void;
}

export function QuestionEditor({ question, onSave, onCancel }: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question>({ ...question });
  const [errors, setErrors] = useState<string[]>([]);

  const validateQuestion = (): boolean => {
    const newErrors: string[] = [];

    if (!editedQuestion.question.trim()) {
      newErrors.push("題目內容不能為空");
    }

    if (editedQuestion.type !== "fill_in_the_blanks") {
      if (editedQuestion.options.length < 2) {
        newErrors.push("至少需要兩個選項");
      }

      const labels = editedQuestion.options.map((opt) => opt.label);
      if (new Set(labels).size !== labels.length) {
        newErrors.push("選項標籤不能重複");
      }

      if (editedQuestion.options.some((opt) => !opt.text.trim())) {
        newErrors.push("所有選項內容不能為空");
      }

      if (editedQuestion.type === "single" && editedQuestion.correctAnswer.length !== 1) {
        newErrors.push("單選題只能有一個正確答案");
      }

      if (editedQuestion.type === "multiple" && editedQuestion.correctAnswer.length === 0) {
        newErrors.push("多選題至少需要一個正確答案");
      }
    }

    if (!editedQuestion.explanation.trim()) {
      newErrors.push("解析不能為空");
    }

    if (editedQuestion.correctAnswer.length === 0) {
      newErrors.push("必須設定正確答案");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validateQuestion()) {
      onSave(editedQuestion);
      toast.success("題目已更新");
    } else {
      toast.error("請修正驗證錯誤");
    }
  };

  const addOption = () => {
    const existingLabels = editedQuestion.options.map((opt) => opt.label);
    const allLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const nextLabel = allLabels.find((label) => !existingLabels.includes(label));

    if (!nextLabel) {
      toast.error("選項數量已達上限");
      return;
    }

    setEditedQuestion({
      ...editedQuestion,
      options: [
        ...editedQuestion.options,
        { label: nextLabel, text: "" },
      ],
    });
  };

  const removeOption = (index: number) => {
    const removedLabel = editedQuestion.options[index].label;
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.filter((_, i) => i !== index),
      correctAnswer: editedQuestion.correctAnswer.filter((ans) => ans !== removedLabel),
    });
  };

  const updateOption = (index: number, field: "label" | "text", value: string) => {
    const oldLabel = editedQuestion.options[index].label;
    const newOptions = [...editedQuestion.options];
    newOptions[index] = { ...newOptions[index], [field]: value };

    let newCorrectAnswer = [...editedQuestion.correctAnswer];
    if (field === "label" && oldLabel !== value) {
      newCorrectAnswer = newCorrectAnswer.map((ans) =>
        ans === oldLabel ? value : ans
      );
    }

    setEditedQuestion({
      ...editedQuestion,
      options: newOptions,
      correctAnswer: newCorrectAnswer,
    });
  };

  const toggleCorrectAnswer = (label: string) => {
    if (editedQuestion.type === "single") {
      setEditedQuestion({
        ...editedQuestion,
        correctAnswer: [label],
      });
    } else if (editedQuestion.type === "multiple") {
      const newCorrectAnswer = editedQuestion.correctAnswer.includes(label)
        ? editedQuestion.correctAnswer.filter((ans) => ans !== label)
        : [...editedQuestion.correctAnswer, label];
      setEditedQuestion({
        ...editedQuestion,
        correctAnswer: newCorrectAnswer,
      });
    }
  };

  const updateFillInAnswer = (value: string) => {
    const answers = value.split(",").map((ans) => ans.trim()).filter(Boolean);
    setEditedQuestion({
      ...editedQuestion,
      correctAnswer: answers,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              編輯題目
              <Badge
                variant={
                  editedQuestion.type === "multiple"
                    ? "default"
                    : editedQuestion.type === "fill_in_the_blanks"
                    ? "secondary"
                    : "outline"
                }
                className={
                  editedQuestion.type === "multiple"
                    ? "bg-accent hover:bg-accent"
                    : ""
                }
              >
                {editedQuestion.type === "multiple"
                  ? "多選"
                  : editedQuestion.type === "fill_in_the_blanks"
                  ? "填充"
                  : "單選"}
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X size={24} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {errors.length > 0 && (
            <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
              <div className="font-semibold text-destructive mb-2">請修正以下錯誤：</div>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="question-type">題目類型</Label>
            <RadioGroup
              value={editedQuestion.type}
              onValueChange={(value: "single" | "multiple" | "fill_in_the_blanks") =>
                setEditedQuestion({
                  ...editedQuestion,
                  type: value,
                  options: value === "fill_in_the_blanks" ? [] : editedQuestion.options.length > 0 ? editedQuestion.options : [{ label: "A", text: "" }, { label: "B", text: "" }],
                  correctAnswer: value === "single" ? editedQuestion.correctAnswer.slice(0, 1) : editedQuestion.correctAnswer,
                })
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="type-single" />
                <Label htmlFor="type-single">單選</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple" id="type-multiple" />
                <Label htmlFor="type-multiple">多選</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fill_in_the_blanks" id="type-fill" />
                <Label htmlFor="type-fill">填充題</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question">題目內容</Label>
            <Textarea
              id="question"
              value={editedQuestion.question}
              onChange={(e) =>
                setEditedQuestion({ ...editedQuestion, question: e.target.value })
              }
              placeholder="請輸入題目內容"
              rows={3}
            />
          </div>

          {editedQuestion.chapter !== undefined && (
            <div className="space-y-2">
              <Label htmlFor="chapter">章節（選填）</Label>
              <Input
                id="chapter"
                value={editedQuestion.chapter || ""}
                onChange={(e) =>
                  setEditedQuestion({ ...editedQuestion, chapter: e.target.value })
                }
                placeholder="例如：第一章"
              />
            </div>
          )}

          {editedQuestion.type !== "fill_in_the_blanks" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>選項設定</Label>
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-1" size={16} />
                  新增選項
                </Button>
              </div>

              <div className="space-y-3">
                {editedQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {editedQuestion.type === "single" ? (
                      <RadioGroup
                        value={editedQuestion.correctAnswer[0] || ""}
                        onValueChange={() => toggleCorrectAnswer(option.label)}
                      >
                        <RadioGroupItem value={option.label} />
                      </RadioGroup>
                    ) : (
                      <Checkbox
                        checked={editedQuestion.correctAnswer.includes(option.label)}
                        onCheckedChange={() => toggleCorrectAnswer(option.label)}
                      />
                    )}
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        updateOption(index, "label", e.target.value.toUpperCase())
                      }
                      className="w-20"
                      placeholder="A"
                    />
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(index, "text", e.target.value)}
                      placeholder="選項內容"
                      className="flex-1"
                    />
                    {editedQuestion.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash size={18} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                {editedQuestion.type === "single" ? "點選" : "勾選"}正確答案：
                {editedQuestion.correctAnswer.length > 0 ? (
                  <Badge variant="outline" className="ml-2">
                    {editedQuestion.correctAnswer.join(", ")}
                  </Badge>
                ) : (
                  <span className="ml-2 text-destructive">尚未設定</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="fill-answer">正確答案（多個答案用逗號分隔）</Label>
              <Input
                id="fill-answer"
                value={editedQuestion.correctAnswer.join(", ")}
                onChange={(e) => updateFillInAnswer(e.target.value)}
                placeholder="例如：TCP, tcp"
              />
              <p className="text-xs text-muted-foreground">
                填充題不區分大小寫，多個可能的正確答案請用逗號分隔
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="explanation">解析</Label>
            <Textarea
              id="explanation"
              value={editedQuestion.explanation}
              onChange={(e) =>
                setEditedQuestion({ ...editedQuestion, explanation: e.target.value })
              }
              placeholder="請輸入答案解析"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <X className="mr-2" />
              取消
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Check className="mr-2" />
              儲存變更
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
