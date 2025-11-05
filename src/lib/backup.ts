import JSZip from "jszip";
import { Question, QuestionStats, ExamResult, Subject } from "./questions";

export interface BackupData {
  version: string;
  exportDate: string;
  subjects: Subject[];
  questions: Record<string, Question[]>;
  questionStats: Record<string, QuestionStats[]>;
  examResults: ExamResult[];
}

export async function exportAllDataAsZip(
  subjects: Subject[],
  questions: Record<string, Question[]>,
  questionStats: Record<string, QuestionStats[]>,
  examResults: ExamResult[]
): Promise<void> {
  try {
    console.log("開始導出 ZIP 備份");
    console.log("科目數:", subjects.length);
    console.log("題庫科目數:", Object.keys(questions).length);
    console.log("統計科目數:", Object.keys(questionStats).length);
    console.log("考試記錄數:", examResults.length);

    const zip = new JSZip();

    const metadata = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      description: "考試系統完整備份",
    };
    zip.file("metadata.json", JSON.stringify(metadata, null, 2));

    zip.file("subjects.json", JSON.stringify(subjects, null, 2));

    const questionsFolder = zip.folder("questions");
    if (questionsFolder && Object.keys(questions).length > 0) {
      Object.entries(questions).forEach(([subjectId, questionList]) => {
        questionsFolder.file(
          `${subjectId}.json`,
          JSON.stringify(questionList, null, 2)
        );
      });
    } else if (questionsFolder) {
      questionsFolder.file(".placeholder", "此文件夾用於存放各科目題庫");
    }

    const statsFolder = zip.folder("stats");
    if (statsFolder && Object.keys(questionStats).length > 0) {
      Object.entries(questionStats).forEach(([subjectId, statsList]) => {
        statsFolder.file(
          `${subjectId}.json`,
          JSON.stringify(statsList, null, 2)
        );
      });
    } else if (statsFolder) {
      statsFolder.file(".placeholder", "此文件夾用於存放各科目答題統計");
    }

    zip.file("exam-results.json", JSON.stringify(examResults, null, 2));

    const statsCount = Object.values(questionStats).reduce(
      (sum, stats) => sum + stats.length,
      0
    );
    const questionsCount = Object.values(questions).reduce(
      (sum, qs) => sum + qs.length,
      0
    );

    const readme = `# 考試系統備份檔案

## 備份資訊

- 導出時間: ${new Date().toLocaleString("zh-TW")}
- 備份版本: 2.0
- 科目數量: ${subjects.length}
- 題目數量: ${questionsCount}
- 統計記錄: ${statsCount} 筆
- 考試記錄: ${examResults.length} 筆

## 檔案結構說明

- metadata.json: 備份資訊（版本、日期）
- subjects.json: 科目列表
- questions/: 各科目題庫（按科目 ID 分檔）
  ${Object.keys(questions).length > 0 
    ? Object.keys(questions).map(id => `  - ${id}.json`).join('\n  ')
    : '  (目前無題庫)'}
- stats/: 各科目答題統計（按科目 ID 分檔）
  ${Object.keys(questionStats).length > 0
    ? Object.keys(questionStats).map(id => `  - ${id}.json`).join('\n  ')
    : '  (目前無統計)'}
- exam-results.json: 所有考試記錄

## 導入方式

1. 在考試系統中，點擊「設定」
2. 在設定頁面找到「導入數據」區域
3. 點擊「選擇 ZIP 備份檔案上傳」按鈕
4. 選擇此 ZIP 檔案
5. 系統會自動驗證並導入所有數據

## 注意事項

- 導入操作會覆蓋現有數據，請謹慎操作
- 建議在導入前先備份當前數據
- 如果導入失敗，系統會顯示詳細錯誤訊息
- 支援跨設備導入，可在不同瀏覽器或電腦上恢復數據
`;
    zip.file("README.txt", readme);

    console.log("開始生成 ZIP 檔案...");
    const blob = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    console.log("ZIP 檔案生成完成，大小:", (blob.size / 1024).toFixed(2), "KB");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-system-backup-${Date.now()}.zip`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("ZIP 下載完成");
    }, 100);
  } catch (error) {
    console.error("ZIP 導出失敗:", error);
    throw new Error(`ZIP 檔案生成失敗: ${error instanceof Error ? error.message : "未知錯誤"}`);
  }
}

export async function importDataFromZip(
  file: File
): Promise<{
  subjects?: Subject[];
  questions?: Record<string, Question[]>;
  questionStats?: Record<string, QuestionStats[]>;
  examResults?: ExamResult[];
}> {
  try {
    const zip = await JSZip.loadAsync(file);

    const data: {
      subjects?: Subject[];
      questions?: Record<string, Question[]>;
      questionStats?: Record<string, QuestionStats[]>;
      examResults?: ExamResult[];
    } = {};

    const subjectsFile = zip.file("subjects.json");
    if (subjectsFile) {
      const content = await subjectsFile.async("string");
      data.subjects = JSON.parse(content);
    }

    const questionsFolder = zip.folder("questions");
    if (questionsFolder) {
      data.questions = {};
      const questionFiles = questionsFolder.filter((relativePath, file) => {
        return !file.dir && relativePath.endsWith(".json");
      });

      for (const file of questionFiles) {
        const content = await file.async("string");
        const subjectId = file.name.replace("questions/", "").replace(".json", "");
        data.questions[subjectId] = JSON.parse(content);
      }
    }

    const statsFolder = zip.folder("stats");
    if (statsFolder) {
      data.questionStats = {};
      const statsFiles = statsFolder.filter((relativePath, file) => {
        return !file.dir && relativePath.endsWith(".json");
      });

      for (const file of statsFiles) {
        const content = await file.async("string");
        const subjectId = file.name.replace("stats/", "").replace(".json", "");
        data.questionStats[subjectId] = JSON.parse(content);
      }
    }

    const resultsFile = zip.file("exam-results.json");
    if (resultsFile) {
      const content = await resultsFile.async("string");
      data.examResults = JSON.parse(content);
    }

    return data;
  } catch (error) {
    console.error("ZIP 導入失敗:", error);
    throw new Error(
      error instanceof Error ? `ZIP 解析失敗: ${error.message}` : "ZIP 檔案解析失敗"
    );
  }
}

export function validateBackupData(data: {
  subjects?: Subject[];
  questions?: Record<string, Question[]>;
  questionStats?: Record<string, QuestionStats[]>;
  examResults?: ExamResult[];
}): string[] {
  const errors: string[] = [];

  if (data.subjects) {
    if (!Array.isArray(data.subjects)) {
      errors.push("❌ subjects 格式錯誤：應為陣列格式");
    } else {
      data.subjects.forEach((subject, index) => {
        if (!subject.id || typeof subject.id !== "string") {
          errors.push(`❌ subjects[${index}].id 缺失或格式錯誤`);
        }
        if (!subject.name || typeof subject.name !== "string") {
          errors.push(`❌ subjects[${index}].name 缺失或格式錯誤`);
        }
      });
    }
  }

  if (data.questions) {
    if (typeof data.questions !== "object" || Array.isArray(data.questions)) {
      errors.push("❌ questions 格式錯誤：應為物件格式 { [subjectId: string]: Question[] }");
    } else {
      Object.entries(data.questions).forEach(([subjectId, questionList]) => {
        if (!Array.isArray(questionList)) {
          errors.push(`❌ questions["${subjectId}"] 應為陣列格式`);
        } else {
          questionList.forEach((q, index) => {
            if (typeof q.id !== "number") {
              errors.push(`❌ questions["${subjectId}"][${index}].id 應為數字`);
            }
            if (!q.question || typeof q.question !== "string") {
              errors.push(`❌ questions["${subjectId}"][${index}].question 缺失或格式錯誤`);
            }
            if (!["single", "multiple", "fill_in_the_blanks"].includes(q.type)) {
              errors.push(
                `❌ questions["${subjectId}"][${index}].type 應為 'single'、'multiple' 或 'fill_in_the_blanks'`
              );
            }
            if (!Array.isArray(q.correctAnswer)) {
              errors.push(
                `❌ questions["${subjectId}"][${index}].correctAnswer 應為陣列格式`
              );
            }
          });
        }
      });
    }
  }

  if (data.questionStats) {
    if (
      typeof data.questionStats !== "object" ||
      Array.isArray(data.questionStats)
    ) {
      errors.push(
        "❌ questionStats 格式錯誤：應為物件格式 { [subjectId: string]: QuestionStats[] }"
      );
    } else {
      Object.entries(data.questionStats).forEach(([subjectId, stats]) => {
        if (!Array.isArray(stats)) {
          errors.push(`❌ questionStats["${subjectId}"] 應為陣列格式`);
        } else {
          stats.forEach((stat, index) => {
            if (typeof stat.questionId !== "number") {
              errors.push(
                `❌ questionStats["${subjectId}"][${index}].questionId 應為數字`
              );
            }
            if (typeof stat.correctCount !== "number") {
              errors.push(
                `❌ questionStats["${subjectId}"][${index}].correctCount 應為數字`
              );
            }
            if (typeof stat.incorrectCount !== "number") {
              errors.push(
                `❌ questionStats["${subjectId}"][${index}].incorrectCount 應為數字`
              );
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
      data.examResults.forEach((result, index) => {
        if (!result.id) {
          errors.push(`❌ examResults[${index}].id 缺失`);
        }
        if (typeof result.score !== "number") {
          errors.push(`❌ examResults[${index}].score 應為數字`);
        }
        if (typeof result.totalQuestions !== "number") {
          errors.push(`❌ examResults[${index}].totalQuestions 應為數字`);
        }
        if (typeof result.correctAnswers !== "number") {
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

  if (
    !data.subjects &&
    !data.questions &&
    !data.questionStats &&
    !data.examResults
  ) {
    errors.push("❌ 備份檔案中沒有找到任何有效數據");
  }

  return errors;
}
