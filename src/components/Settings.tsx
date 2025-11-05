import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  DownloadSimple,
  UploadSimple,
  Database,
  Trash,
  X,
  FileArrowDown,
  Warning,
  CheckCircle,
  FileZip,
  Package,
} from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QuestionStats, ExamResult, Subject, Question } from "@/lib/questions";
import { exportAllDataAsZip, importDataFromZip, validateBackupData } from "@/lib/backup";

interface SettingsProps {
  subjects: Subject[];
  allQuestions: Record<string, Question[]>;
  questionStats: Record<string, QuestionStats[]>;
  examResults: ExamResult[];
  onImportData: (data: {
    subjects?: Subject[];
    questions?: Record<string, Question[]>;
    questionStats?: Record<string, QuestionStats[]>;
    examResults?: ExamResult[];
  }) => void;
  onClearAllData: () => void;
  onClose: () => void;
}

export function Settings({
  subjects,
  allQuestions,
  questionStats,
  examResults,
  onImportData,
  onClearAllData,
  onClose,
}: SettingsProps) {
  const [importText, setImportText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleExportZip = async () => {
    try {
      const allQuestionsData: Record<string, Question[]> = {};
      
      for (const subject of subjects) {
        const questions = await window.spark.kv.get<Question[]>(`questions-${subject.id}`);
        if (questions && questions.length > 0) {
          allQuestionsData[subject.id] = questions;
        }
      }
      
      await exportAllDataAsZip(subjects, allQuestionsData, questionStats, examResults);
      toast.success("ZIP 備份檔案已下載");
    } catch (error) {
      console.error("ZIP 導出失敗:", error);
      toast.error(error instanceof Error ? error.message : "ZIP 導出失敗");
    }
  };

  const handleExportQuestionsZip = async () => {
    try {
      const zip = new JSZip();

      const allQuestionsData: Record<string, Question[]> = {};
      let totalQuestionsCount = 0;
      
      for (const subject of subjects) {
        const questions = await window.spark.kv.get<Question[]>(`questions-${subject.id}`);
        if (questions && questions.length > 0) {
          allQuestionsData[subject.id] = questions;
          totalQuestionsCount += questions.length;
        }
      }

      if (Object.keys(allQuestionsData).length === 0) {
        toast.error("目前沒有任何題庫可導出");
        return;
      }

      const metadata = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        description: "考試系統題庫批量導出",
        subjectCount: subjects.length,
        totalQuestions: totalQuestionsCount,
      };
      zip.file("metadata.json", JSON.stringify(metadata, null, 2));

      const questionsFolder = zip.folder("questions");
      if (questionsFolder) {
        for (const subject of subjects) {
          const questions = allQuestionsData[subject.id];
          if (questions && questions.length > 0) {
            const fileName = `${subject.id}_${subject.name}.json`;
            questionsFolder.file(fileName, JSON.stringify(questions, null, 2));
          }
        }
      }

      const subjectList = subjects
        .map((s) => {
          const count = allQuestionsData[s.id]?.length || 0;
          return `- ${s.name} (${s.id}): ${count} 道題目`;
        })
        .join("\n");

      const readme = `# 考試系統題庫導出

## 導出資訊

- 導出時間: ${new Date().toLocaleString("zh-TW")}
- 版本: 1.0
- 科目數量: ${subjects.length}
- 總題目數: ${metadata.totalQuestions}

## 科目列表

${subjectList}

## 檔案結構

- metadata.json: 導出資訊（版本、時間、統計）
- questions/: 各科目題庫資料夾
${subjects
  .filter((s) => allQuestionsData[s.id] && allQuestionsData[s.id].length > 0)
  .map((s) => `  - ${s.id}_${s.name}.json (${allQuestionsData[s.id].length} 題)`)
  .join("\n")}

## 導入方式

### 方式一：在題庫管理頁面導入
1. 進入特定科目的「題庫管理」頁面
2. 點擊「上傳題庫」按鈕
3. 選擇對應科目的 JSON 檔案
4. 確認導入

### 方式二：在設定頁面使用 ZIP 完整備份
1. 進入「設定」頁面
2. 點擊「選擇 ZIP 備份檔案上傳」
3. 選擇此 ZIP 檔案
4. 系統會自動導入所有題庫

## 注意事項

- 每個 JSON 檔案對應一個科目的題庫
- 檔案名格式：科目ID_科目名稱.json
- 導入時會根據科目 ID 自動匹配對應科目
- 建議先備份現有數據再進行導入操作
- 題目格式必須符合系統規範（包含 id, question, type, options, correctAnswer, explanation 等欄位）
`;
      zip.file("README.txt", readme);

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questions-export-${Date.now()}.zip`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success(
        `✅ 題庫已導出\n\n共 ${subjects.length} 個科目，${metadata.totalQuestions} 道題目`,
        {
          duration: 5000,
        }
      );
    } catch (error) {
      console.error("題庫 ZIP 導出失敗:", error);
      toast.error(
        error instanceof Error ? error.message : "題庫 ZIP 導出失敗"
      );
    }
  };

  const handleExportAll = () => {
    try {
      const data = {
        questionStats,
        examResults,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam-data-backup-${Date.now()}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("數據已導出");
    } catch (error) {
      console.error("導出失敗：", error);
      toast.error("導出失敗，請稍後再試");
    }
  };

  const handleExportStats = () => {
    try {
      const jsonString = JSON.stringify(questionStats, null, 2);
      const blob = new Blob([jsonString], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `question-stats-${Date.now()}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("題目統計已導出");
    } catch (error) {
      console.error("導出失敗：", error);
      toast.error("導出失敗，請稍後再試");
    }
  };

  const handleExportResults = () => {
    try {
      const jsonString = JSON.stringify(examResults, null, 2);
      const blob = new Blob([jsonString], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam-results-${Date.now()}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("考試記錄已導出");
    } catch (error) {
      console.error("導出失敗：", error);
      toast.error("導出失敗，請稍後再試");
    }
  };

  const validateImportData = (data: any): string[] => {
    const errors: string[] = [];

    if (data.questionStats) {
      if (typeof data.questionStats !== 'object' || Array.isArray(data.questionStats)) {
        errors.push("❌ questionStats 格式錯誤：應為物件格式 { [subjectId: string]: QuestionStats[] }");
      } else {
        Object.entries(data.questionStats).forEach(([subjectId, stats]) => {
          if (!Array.isArray(stats)) {
            errors.push(`❌ questionStats["${subjectId}"] 應為陣列格式`);
          } else {
            stats.forEach((stat: any, index: number) => {
              if (typeof stat.questionId !== 'number') {
                errors.push(`❌ questionStats["${subjectId}"][${index}].questionId 應為數字`);
              }
              if (typeof stat.correctCount !== 'number') {
                errors.push(`❌ questionStats["${subjectId}"][${index}].correctCount 應為數字`);
              }
              if (typeof stat.incorrectCount !== 'number') {
                errors.push(`❌ questionStats["${subjectId}"][${index}].incorrectCount 應為數字`);
              }
            });
          }
        });
      }
    }

    if (data.examResults) {
      if (!Array.isArray(data.examResults)) {
        errors.push("❌ examResults 格式錯誤：應為陣列格式");
      } else {
        data.examResults.forEach((result: any, index: number) => {
          if (!result.id) {
            errors.push(`❌ examResults[${index}].id 缺失`);
          }
          if (typeof result.score !== 'number') {
            errors.push(`❌ examResults[${index}].score 應為數字`);
          }
          if (typeof result.totalQuestions !== 'number') {
            errors.push(`❌ examResults[${index}].totalQuestions 應為數字`);
          }
          if (typeof result.correctAnswers !== 'number') {
            errors.push(`❌ examResults[${index}].correctAnswers 應為數字`);
          }
          if (!result.subjectId) {
            errors.push(`❌ examResults[${index}].subjectId 缺失`);
          }
          if (!Array.isArray(result.answers)) {
            errors.push(`❌ examResults[${index}].answers 應為陣列格式`);
          }
        });
      }
    }

    if (!data.questionStats && !data.examResults) {
      errors.push("❌ 數據必須包含 questionStats 或 examResults 欄位");
    }

    return errors;
  };

  const handleImport = () => {
    if (!importText.trim()) {
      toast.error("請輸入要導入的 JSON 數據");
      setValidationErrors([]);
      return;
    }

    try {
      const data = JSON.parse(importText);
      const errors = validateImportData(data);

      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error(`數據驗證失敗，發現 ${errors.length} 個錯誤`, {
          duration: 5000,
        });
        return;
      }

      onImportData({
        questionStats: data.questionStats,
        examResults: data.examResults,
      });
      
      const importedItems: string[] = [];
      if (data.questionStats) {
        const subjectCount = Object.keys(data.questionStats).length;
        const totalStats = Object.values(data.questionStats).reduce(
          (sum: number, stats: any) => sum + stats.length,
          0
        );
        importedItems.push(`${subjectCount} 個科目，共 ${totalStats} 筆統計數據`);
      }
      if (data.examResults) {
        importedItems.push(`${data.examResults.length} 筆考試記錄`);
      }

      toast.success(`✅ 數據已成功導入\n\n${importedItems.join("\n")}`, {
        duration: 5000,
      });
      setImportText("");
      setValidationErrors([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知錯誤";
      let detailedError = errorMessage;
      
      if (error instanceof SyntaxError) {
        const match = errorMessage.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const context = importText.substring(Math.max(0, position - 20), position + 20);
          detailedError = `${errorMessage}\n\n錯誤位置附近內容：\n...${context}...`;
        }
      }

      setValidationErrors([`JSON 解析失敗：${detailedError}`]);
      toast.error(`❌ JSON 格式錯誤\n\n${detailedError}\n\n請檢查 JSON 格式是否正確`, {
        duration: 10000,
      });
      console.error("JSON 解析錯誤詳情：", error);
    }
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      toast.error("請上傳 .zip 格式的檔案");
      return;
    }

    try {
      toast.loading("正在解析 ZIP 檔案...");
      const data = await importDataFromZip(file);
      
      const errors = validateBackupData(data);
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.dismiss();
        toast.error(`ZIP 檔案驗證失敗，發現 ${errors.length} 個錯誤`, {
          duration: 5000,
        });
        return;
      }

      onImportData(data);

      const importedItems: string[] = [];
      if (data.subjects) {
        importedItems.push(`${data.subjects.length} 個科目`);
      }
      if (data.questions) {
        const totalQuestions = Object.values(data.questions).reduce(
          (sum, qs) => sum + qs.length,
          0
        );
        importedItems.push(`${totalQuestions} 道題目`);
      }
      if (data.questionStats) {
        const totalStats = Object.values(data.questionStats).reduce(
          (sum, stats) => sum + stats.length,
          0
        );
        importedItems.push(`${totalStats} 筆統計數據`);
      }
      if (data.examResults) {
        importedItems.push(`${data.examResults.length} 筆考試記錄`);
      }

      toast.dismiss();
      toast.success(`✅ ZIP 備份已成功導入\n\n${importedItems.join("\n")}`, {
        duration: 5000,
      });
      setValidationErrors([]);
    } catch (error) {
      toast.dismiss();
      console.error("ZIP 導入錯誤:", error);
      const errorMessage = error instanceof Error ? error.message : "未知錯誤";
      setValidationErrors([errorMessage]);
      toast.error(`ZIP 導入失敗\n\n${errorMessage}`, {
        duration: 10000,
      });
    } finally {
      if (zipInputRef.current) {
        zipInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("請上傳 .json 格式的檔案");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);
      toast.success(`檔案已載入：${file.name}`);
    };
    reader.onerror = () => {
      toast.error("檔案讀取失敗");
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Database weight="fill" />
            設定與數據管理
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">數據概覽</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-secondary space-y-1">
                  <div className="text-2xl font-bold text-primary">
                    {Object.keys(questionStats).length}
                  </div>
                  <div className="text-sm text-muted-foreground">科目統計</div>
                </div>
                <div className="p-4 rounded-lg bg-secondary space-y-1">
                  <div className="text-2xl font-bold text-primary">
                    {examResults.length}
                  </div>
                  <div className="text-sm text-muted-foreground">考試記錄</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DownloadSimple weight="fill" className="text-primary" />
                <h3 className="text-lg font-semibold">導出數據</h3>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="default"
                  onClick={handleExportZip}
                  className="justify-start"
                  size="lg"
                >
                  <FileZip className="mr-2" weight="fill" />
                  導出完整備份（ZIP 格式）
                  <Badge variant="secondary" className="ml-auto">
                    推薦
                  </Badge>
                </Button>
                <div className="text-xs text-muted-foreground px-3 py-2 bg-muted rounded-md">
                  包含：科目、題庫、統計、考試記錄
                </div>
                <Button
                  variant="default"
                  onClick={handleExportQuestionsZip}
                  className="justify-start"
                  size="lg"
                  disabled={Object.keys(allQuestions).length === 0}
                >
                  <Package className="mr-2" weight="fill" />
                  批量導出所有題庫（ZIP 格式）
                  {Object.keys(allQuestions).length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {subjects.length} 科目
                    </Badge>
                  )}
                  {Object.keys(allQuestions).length === 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      無題庫
                    </Badge>
                  )}
                </Button>
                <div className="text-xs text-muted-foreground px-3 py-2 bg-muted rounded-md">
                  僅包含：各科目題庫 JSON 檔案（按科目分檔）
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportAll}
                  className="justify-start"
                >
                  <DownloadSimple className="mr-2" weight="fill" />
                  導出所有數據（JSON 格式）
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportStats}
                  className="justify-start"
                  disabled={Object.keys(questionStats).length === 0}
                >
                  <DownloadSimple className="mr-2" weight="fill" />
                  僅導出題目統計
                  {Object.keys(questionStats).length === 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      無數據
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportResults}
                  className="justify-start"
                  disabled={examResults.length === 0}
                >
                  <DownloadSimple className="mr-2" weight="fill" />
                  僅導出考試記錄
                  {examResults.length === 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      無數據
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UploadSimple weight="fill" className="text-primary" />
                <h3 className="text-lg font-semibold">導入數據</h3>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Package weight="fill" />
                  ZIP 完整備份
                </Label>
                <Button
                  variant="default"
                  onClick={() => zipInputRef.current?.click()}
                  className="w-full"
                  size="lg"
                >
                  <FileZip className="mr-2" weight="fill" />
                  選擇 ZIP 備份檔案上傳
                  <Badge variant="secondary" className="ml-auto">
                    推薦
                  </Badge>
                </Button>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                />
                <div className="text-xs text-muted-foreground px-3 py-2 bg-muted rounded-md">
                  將自動導入科目、題庫、統計、考試記錄等所有數據
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <Label className="text-base font-semibold">JSON 格式導入</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <FileArrowDown className="mr-2" weight="fill" />
                    選擇 JSON 檔案
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportText("");
                      setValidationErrors([]);
                    }}
                    disabled={!importText}
                  >
                    清空
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-data">
                  或貼上 JSON 數據
                </Label>
                <ScrollArea className="h-[300px] w-full rounded-md border">
                  <Textarea
                    id="import-data"
                    placeholder='{"questionStats": {...}, "examResults": [...]}'
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setValidationErrors([]);
                    }}
                    className="min-h-[300px] font-mono text-xs border-0 focus-visible:ring-0 resize-none"
                  />
                </ScrollArea>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-semibold">
                    <Warning weight="fill" size={20} />
                    發現 {validationErrors.length} 個驗證錯誤
                  </div>
                  <ScrollArea className="h-[200px]">
                    <ul className="space-y-1 text-sm">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-destructive font-mono">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              {importText && validationErrors.length === 0 && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/50 flex items-center gap-2 text-sm">
                  <CheckCircle weight="fill" className="text-accent" size={20} />
                  <span className="text-accent-foreground">
                    JSON 格式初步驗證通過，點擊下方按鈕導入
                  </span>
                </div>
              )}

              <Button 
                onClick={handleImport} 
                className="w-full"
                disabled={!importText.trim()}
              >
                <UploadSimple className="mr-2" weight="fill" />
                驗證並導入數據
              </Button>

              <div className="p-3 rounded-lg bg-muted text-xs space-y-2">
                <p className="font-semibold">支援格式：</p>
                <pre className="bg-background p-2 rounded overflow-x-auto">
{`{
  "questionStats": {
    "subject-id": [
      {
        "questionId": 1,
        "correctCount": 5,
        "incorrectCount": 2,
        "isImportant": false
      }
    ]
  },
  "examResults": [...]
}`}
                </pre>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Trash weight="fill" className="text-destructive" />
                <h3 className="text-lg font-semibold text-destructive">
                  危險操作
                </h3>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash className="mr-2" weight="fill" />
                    清除所有數據
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確定要清除所有數據嗎？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作將清除所有科目的題目統計和考試記錄，且無法恢復。建議先導出備份。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onClearAllData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      確定清除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="p-4 rounded-lg bg-muted text-sm space-y-2">
              <p className="font-semibold">提示：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">推薦使用 ZIP 格式</strong>：包含完整數據（科目、題庫、統計、記錄）
                </li>
                <li>
                  <strong className="text-foreground">批量導出題庫</strong>：僅導出所有科目的題目檔案，方便題庫管理和分享
                </li>
                <li>ZIP 備份可在任何設備上完整恢復系統狀態</li>
                <li>題庫 ZIP 中的檔案按科目分別存放，可單獨導入到對應科目</li>
                <li>JSON 格式適合單獨導入統計或記錄數據</li>
                <li>導入數據會覆蓋現有數據，請謹慎操作</li>
                <li>導入前會進行完整的數據驗證，確保格式正確</li>
                <li>建議定期使用 ZIP 格式備份數據以防丟失</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
