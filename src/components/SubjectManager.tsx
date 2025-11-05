import { useState } from "react";
import { Subject, loadQuestions } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  PencilSimple,
  X,
  FloppyDisk,
  DownloadSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import JSZip from "jszip";

interface SubjectManagerProps {
  subjects: Subject[];
  onSubjectsUpdate: (subjects: Subject[]) => void;
  onClose: () => void;
}

export function SubjectManager({
  subjects,
  onSubjectsUpdate,
  onClose,
}: SubjectManagerProps) {
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    icon: "",
  });

  const startCreating = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      icon: "📚",
    });
    setEditingSubject(null);
    setIsCreating(true);
  };

  const startEditing = (subject: Subject) => {
    setFormData({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      icon: subject.icon,
    });
    setEditingSubject(subject);
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setIsCreating(false);
    setEditingSubject(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("請輸入科目名稱");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("請輸入科目描述");
      return;
    }

    if (!formData.icon.trim()) {
      toast.error("請輸入科目圖標");
      return;
    }

    const id = editingSubject?.id || formData.name.toLowerCase().replace(/\s+/g, '-');
    
    if (!editingSubject && subjects.some(s => s.id === id)) {
      toast.error("科目 ID 已存在，請使用不同的名稱");
      return;
    }

    const newSubject: Subject = {
      id,
      name: formData.name.trim(),
      description: formData.description.trim(),
      icon: formData.icon.trim(),
    };

    if (editingSubject) {
      const updatedSubjects = subjects.map((s) =>
        s.id === editingSubject.id ? newSubject : s
      );
      onSubjectsUpdate(updatedSubjects);
      toast.success("科目已更新");
    } else {
      onSubjectsUpdate([...subjects, newSubject]);
      toast.success("科目已新增");
    }

    setIsCreating(false);
    setEditingSubject(null);
  };

  const handleDelete = (subjectId: string) => {
    if (
      window.confirm("確定要刪除此科目嗎？這將不會影響該科目的題庫和答題記錄。")
    ) {
      const updatedSubjects = subjects.filter((s) => s.id !== subjectId);
      onSubjectsUpdate(updatedSubjects);
      toast.success("科目已刪除");
    }
  };

  const handleBulkExport = async () => {
    try {
      toast.info("正在準備匯出檔案...");
      const zip = new JSZip();

      for (const subject of subjects) {
        const questions = await loadQuestions(subject.id);
        const fileName = `${subject.id}-${subject.name}.json`;
        const jsonContent = JSON.stringify(questions, null, 2);
        zip.file(fileName, jsonContent);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all-subjects-questions-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`已匯出 ${subjects.length} 個科目的題庫`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("匯出失敗，請稍後再試");
    }
  };

  if (isCreating) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {editingSubject ? "編輯科目" : "新增科目"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={cancelEditing}>
              <X weight="bold" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">科目名稱</Label>
              <Input
                id="name"
                placeholder="例如：資料結構"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">科目描述</Label>
              <Input
                id="description"
                placeholder="例如：資料結構與演算法基礎"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">科目圖標 (emoji)</Label>
              <Input
                id="icon"
                placeholder="例如：📊"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">科目管理</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleBulkExport}>
              <DownloadSimple className="mr-2" weight="fill" />
              批量匯出題庫
            </Button>
            <Button onClick={startCreating}>
              <Plus className="mr-2" weight="fill" />
              新增科目
            </Button>
            <Button variant="outline" onClick={onClose}>
              返回
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            共有 <span className="font-bold text-foreground">{subjects.length}</span> 個科目
          </p>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {subjects.map((subject, index) => (
              <div
                key={subject.id}
                className="p-4 rounded-lg border-2 border-border space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{subject.icon}</span>
                      <div>
                        <p className="font-semibold text-foreground text-lg">
                          {subject.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {subject.description}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {subject.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => startEditing(subject)}
                    >
                      <PencilSimple weight="fill" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(subject.id)}
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
