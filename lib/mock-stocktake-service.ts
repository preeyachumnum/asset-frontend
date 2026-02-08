import { getMockAssetOptions } from "@/lib/mock-assets-service";
import { stocktakeStatuses } from "@/lib/mock-data";
import type {
  StocktakeAccountingStatusCode,
  StocktakeMeetingDocView,
  StocktakeParticipantView,
  StocktakeRecordView,
  StocktakeReportFilters,
  StocktakeSummaryRow,
  StocktakeYearConfigView,
} from "@/lib/types";
import { nowIso, readLocalState, uid, writeLocalState } from "@/lib/mock-utils";

type StocktakeStore = {
  yearConfigs: StocktakeYearConfigView[];
  participants: StocktakeParticipantView[];
  meetingDocs: StocktakeMeetingDocView[];
  records: StocktakeRecordView[];
};

const KEY = "asset_frontend_mock_stocktake_v1";

const statusLabelMap: Record<string, string> = {
  COUNTED: "Counted",
  NOT_COUNTED: "Not Counted",
  PENDING: "Pending",
  REJECTED: "Rejected",
  OTHER: "Other",
};

const accountingStatusLabelMap: Record<StocktakeAccountingStatusCode, string> = {
  SUBMIT: "Submitted by Accounting",
  APPROVED: "Approved by Accounting",
  REJECT: "Rejected by Accounting",
};

function seedStore(): StocktakeStore {
  const year = new Date().getFullYear();
  const assets = getMockAssetOptions().slice(0, 4);
  return {
    yearConfigs: [
      {
        StocktakeYearConfigId: uid(),
        PlantId: "Plant-KLS",
        StocktakeYear: year,
        IsOpen: true,
      },
    ],
    participants: [
      {
        StocktakeParticipantId: uid(),
        PlantId: "Plant-KLS",
        StocktakeYear: year,
        Email: "asset.accounting@mitrphol.com",
        DisplayName: "Asset Accounting",
      },
    ],
    meetingDocs: [],
    records: assets.map((asset, idx) => {
      const statusCode = stocktakeStatuses[idx % stocktakeStatuses.length] as StocktakeRecordView["StatusCode"];
      return {
        StocktakeRecordId: uid(),
        PlantId: "Plant-KLS",
        StocktakeYear: year,
        AssetId: asset.AssetId,
        AssetNo: asset.AssetNo,
        AssetName: asset.AssetName,
        BookValue: asset.BookValue,
        CostCenterName: asset.CostCenterName || "CCA-UNDEFINED",
        AssetGroupName: "General",
        LocationName: "MAIN",
        StatusCode: statusCode,
        StatusName: statusLabelMap[statusCode],
        CountMethod: idx % 2 === 0 ? "QR" : "MANUAL",
        CountedQty: 1,
        CountedAt: new Date(Date.now() - idx * 86400000).toISOString(),
        CountedByName: "Asset Accounting",
        NoteText: idx % 2 === 0 ? "Checked" : "Pending review",
        Images: idx % 2 === 0 ? [`stocktake-${asset.AssetNo}.jpg`] : [],
      };
    }),
  };
}

function readStore() {
  const store = readLocalState<StocktakeStore>(KEY, seedStore());
  const assetMap = new Map(getMockAssetOptions().map((x) => [x.AssetNo, x]));
  store.records = store.records.map((row) => ({
    ...row,
    BookValue: row.BookValue ?? assetMap.get(row.AssetNo)?.BookValue ?? 0,
  }));
  return store;
}

function saveStore(store: StocktakeStore) {
  writeLocalState(KEY, store);
}

function getYearConfig(store: StocktakeStore, plantId: string, year: number) {
  return store.yearConfigs.find((x) => x.PlantId === plantId && x.StocktakeYear === year);
}

export function getOrCreateMockStocktakeYearConfig(plantId: string, stocktakeYear: number) {
  const store = readStore();
  let config = getYearConfig(store, plantId, stocktakeYear);
  if (!config) {
    config = {
      StocktakeYearConfigId: uid(),
      PlantId: plantId,
      StocktakeYear: stocktakeYear,
      IsOpen: true,
    };
    store.yearConfigs.push(config);
    saveStore(store);
  }
  return config;
}

export function closeMockStocktakeYear(plantId: string, stocktakeYear: number, closedBy: string) {
  const store = readStore();
  const config = getYearConfig(store, plantId, stocktakeYear);
  if (!config) throw new Error("Year config not found");
  if (!config.ReportGeneratedAt) {
    throw new Error("Please mark report generated before closing year");
  }
  config.IsOpen = false;
  config.ClosedAt = nowIso();
  config.ClosedBy = closedBy;
  saveStore(store);
  return config;
}

export function markMockStocktakeReportGenerated(plantId: string, stocktakeYear: number) {
  const store = readStore();
  const config = getYearConfig(store, plantId, stocktakeYear);
  if (!config) throw new Error("Year config not found");
  config.ReportGeneratedAt = nowIso();
  saveStore(store);
}

export function carryPendingToNextMockYear(
  plantId: string,
  fromYear: number,
  toYear: number,
  actorName: string,
) {
  const store = readStore();
  const fromConfig = getYearConfig(store, plantId, fromYear);
  if (!fromConfig) throw new Error("From-year config not found");
  if (fromConfig.IsOpen) throw new Error("Please close current year before opening next year");
  if (!fromConfig.ReportGeneratedAt) {
    throw new Error("Please generate previous-year report before opening next year");
  }

  let toConfig = getYearConfig(store, plantId, toYear);
  if (!toConfig) {
    toConfig = {
      StocktakeYearConfigId: uid(),
      PlantId: plantId,
      StocktakeYear: toYear,
      IsOpen: true,
    };
    store.yearConfigs.push(toConfig);
  } else {
    toConfig.IsOpen = true;
  }

  const pendingRows = store.records.filter(
    (x) => x.PlantId === plantId && x.StocktakeYear === fromYear && x.StatusCode === "PENDING",
  );
  pendingRows.forEach((row) => {
    if (
      store.records.some(
        (x) => x.PlantId === plantId && x.StocktakeYear === toYear && x.AssetId === row.AssetId,
      )
    ) {
      return;
    }
    store.records.push({
      ...row,
      StocktakeRecordId: uid(),
      StocktakeYear: toYear,
      CountMethod: "EXCEL",
      CountedAt: nowIso(),
      CountedByName: actorName,
    });
  });
  saveStore(store);
  return pendingRows.length;
}

export function upsertMockStocktakeRecord(input: {
  plantId: string;
  stocktakeYear: number;
  assetNo: string;
  statusCode: StocktakeRecordView["StatusCode"];
  countMethod: StocktakeRecordView["CountMethod"];
  countQty: number;
  noteText?: string;
  countedByName: string;
  imageNames?: string[];
}) {
  const store = readStore();
  const config = getYearConfig(store, input.plantId, input.stocktakeYear);
  if (!config) throw new Error("Year config not found");
  if (!config.IsOpen) throw new Error("Year is closed");

  const asset = getMockAssetOptions().find((x) => x.AssetNo === input.assetNo);
  const assetId = asset?.AssetId || uid();
  const assetName = asset?.AssetName || `Imported Asset ${input.assetNo}`;
  const costCenter = asset?.CostCenterName || "CCA-UNDEFINED";

  let row = store.records.find(
    (x) =>
      x.PlantId === input.plantId &&
      x.StocktakeYear === input.stocktakeYear &&
      x.AssetNo === input.assetNo,
  );

  if (!row) {
    row = {
      StocktakeRecordId: uid(),
      PlantId: input.plantId,
      StocktakeYear: input.stocktakeYear,
      AssetId: assetId,
      AssetNo: input.assetNo,
      AssetName: assetName,
      BookValue: asset?.BookValue || 0,
      CostCenterName: costCenter,
      AssetGroupName: "General",
      LocationName: "MAIN",
      StatusCode: input.statusCode,
      StatusName: statusLabelMap[input.statusCode],
      CountMethod: input.countMethod,
      CountedQty: input.countQty,
      CountedAt: nowIso(),
      CountedByName: input.countedByName,
      NoteText: input.noteText,
      Images: (input.imageNames || []).filter(Boolean),
    };
    store.records.push(row);
  } else {
    row.AssetName = assetName;
    row.BookValue = asset?.BookValue || row.BookValue;
    row.CostCenterName = costCenter;
    row.StatusCode = input.statusCode;
    row.StatusName = statusLabelMap[input.statusCode];
    row.CountMethod = input.countMethod;
    row.CountedQty = input.countQty;
    row.CountedAt = nowIso();
    row.CountedByName = input.countedByName;
    row.NoteText = input.noteText;
    if (input.imageNames && input.imageNames.length) {
      row.Images = input.imageNames;
    }
  }
  saveStore(store);
  return row;
}

export function listMockStocktakeAssetByCostCenter(
  plantId: string,
  stocktakeYear: number,
  costCenterName: string,
) {
  getOrCreateMockStocktakeYearConfig(plantId, stocktakeYear);
  return getMockAssetOptions().filter((x) => x.CostCenterName === costCenterName);
}

export function importMockStocktakeCsv(input: {
  plantId: string;
  stocktakeYear: number;
  csvText: string;
  countedByName: string;
}) {
  const lines = input.csvText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  let imported = 0;
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const [assetNo, statusCodeRaw, note = "", countMethodRaw = "EXCEL", qtyRaw = "1"] = line
      .split(",")
      .map((x) => x.trim());

    const statusCode = (statusCodeRaw || "COUNTED").toUpperCase();
    if (!assetNo) {
      errors.push(`Line ${index + 1}: missing assetNo`);
      return;
    }
    if (!stocktakeStatuses.includes(statusCode)) {
      errors.push(`Line ${index + 1}: invalid statusCode ${statusCode}`);
      return;
    }

    try {
      upsertMockStocktakeRecord({
        plantId: input.plantId,
        stocktakeYear: input.stocktakeYear,
        assetNo,
        statusCode: statusCode as StocktakeRecordView["StatusCode"],
        countMethod: (countMethodRaw.toUpperCase() as StocktakeRecordView["CountMethod"]) || "EXCEL",
        countQty: Math.max(1, Number(qtyRaw) || 1),
        noteText: note,
        countedByName: input.countedByName,
      });
      imported += 1;
    } catch (error) {
      errors.push(`Line ${index + 1}: ${(error as Error).message}`);
    }
  });

  return { imported, errors };
}

export function importMockStocktakeAccountingStatuses(input: {
  plantId: string;
  stocktakeYear: number;
  csvText: string;
}) {
  const lines = input.csvText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const store = readStore();
  const config = getYearConfig(store, input.plantId, input.stocktakeYear);
  if (!config) throw new Error("Year config not found");

  let imported = 0;
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const [assetNoRaw, statusRaw] = line.split(",").map((x) => x.trim());
    const assetNo = assetNoRaw || "";
    const statusCode = (statusRaw || "").toUpperCase() as StocktakeAccountingStatusCode;
    if (!assetNo) {
      errors.push(`Line ${index + 1}: missing assetNo`);
      return;
    }
    if (!["SUBMIT", "APPROVED", "REJECT"].includes(statusCode)) {
      errors.push(`Line ${index + 1}: invalid accounting status`);
      return;
    }

    const row = store.records.find(
      (x) => x.PlantId === input.plantId && x.StocktakeYear === input.stocktakeYear && x.AssetNo === assetNo,
    );
    if (!row) {
      errors.push(`Line ${index + 1}: asset not found in stocktake year`);
      return;
    }

    row.AccountingStatusCode = statusCode;
    row.AccountingStatusName = accountingStatusLabelMap[statusCode];
    imported += 1;
  });

  saveStore(store);
  return { imported, errors };
}

export function addMockStocktakeParticipant(input: {
  plantId: string;
  stocktakeYear: number;
  email: string;
}) {
  const store = readStore();
  if (
    store.participants.some(
      (x) =>
        x.PlantId === input.plantId &&
        x.StocktakeYear === input.stocktakeYear &&
        x.Email.toLowerCase() === input.email.toLowerCase(),
    )
  ) {
    return;
  }
  store.participants.push({
    StocktakeParticipantId: uid(),
    PlantId: input.plantId,
    StocktakeYear: input.stocktakeYear,
    Email: input.email,
    DisplayName: input.email.split("@")[0],
  });
  saveStore(store);
}

export function removeMockStocktakeParticipant(stocktakeParticipantId: string) {
  const store = readStore();
  store.participants = store.participants.filter((x) => x.StocktakeParticipantId !== stocktakeParticipantId);
  saveStore(store);
}

export function addMockStocktakeMeetingDoc(input: {
  plantId: string;
  stocktakeYear: number;
  fileName: string;
}) {
  const store = readStore();
  store.meetingDocs.push({
    StocktakeMeetingDocId: uid(),
    PlantId: input.plantId,
    StocktakeYear: input.stocktakeYear,
    FileName: input.fileName,
    UploadedAt: nowIso(),
  });
  saveStore(store);
}

export function getMockStocktakeWorkspace(plantId: string, stocktakeYear: number) {
  const store = readStore();
  const config = getYearConfig(store, plantId, stocktakeYear) || null;
  const records = store.records.filter((x) => x.PlantId === plantId && x.StocktakeYear === stocktakeYear);
  const participants = store.participants.filter((x) => x.PlantId === plantId && x.StocktakeYear === stocktakeYear);
  const meetingDocs = store.meetingDocs.filter((x) => x.PlantId === plantId && x.StocktakeYear === stocktakeYear);

  const summary: StocktakeSummaryRow[] = stocktakeStatuses.map((code) => ({
    StatusCode: code,
    StatusName: statusLabelMap[code],
    ItemCount: records.filter((x) => x.StatusCode === code).length,
  }));
  const accountingSummary = [
    "SUBMIT",
    "APPROVED",
    "REJECT",
  ].map((code) => ({
    StatusCode: code,
    ItemCount: records.filter((x) => x.AccountingStatusCode === code).length,
  }));

  return { config, records, participants, meetingDocs, summary, accountingSummary };
}

export function getMockStocktakeThreeTabs(plantId: string, stocktakeYear: number) {
  const store = readStore();
  const records = store.records.filter((x) => x.PlantId === plantId && x.StocktakeYear === stocktakeYear);
  const counted = records.filter((x) => x.StatusCode === "COUNTED");
  const rejected = records.filter((x) => x.StatusCode === "PENDING" || x.StatusCode === "REJECTED");

  const assets = getMockAssetOptions();
  const notCounted = assets
    .filter((asset) => !records.some((x) => x.AssetNo === asset.AssetNo && x.StatusCode === "COUNTED"))
    .map((asset) => {
      const row = records.find((x) => x.AssetNo === asset.AssetNo);
      return {
        AssetNo: asset.AssetNo,
        AssetName: asset.AssetName,
        CostCenterName: asset.CostCenterName || "-",
        StatusCode: row?.StatusCode || "NOT_COUNTED",
        CountedByName: row?.CountedByName || "-",
        CountedAt: row?.CountedAt,
      };
    });

  return { counted, notCounted, rejected };
}

export function getMockStocktakeReport(filters: StocktakeReportFilters) {
  const workspace = getMockStocktakeWorkspace(filters.PlantId, filters.StocktakeYear);
  const keyword = (filters.SearchKeyword || "").trim().toLowerCase();
  const cca = (filters.CostCenterKeyword || "").trim().toLowerCase();
  const group = (filters.AssetGroupKeyword || "").trim().toLowerCase();
  const location = (filters.LocationKeyword || "").trim().toLowerCase();

  let details = [...workspace.records];

  if (filters.StatusCode && filters.StatusCode !== "ALL") {
    details = details.filter((x) => x.StatusCode === filters.StatusCode);
  }
  if (keyword) {
    details = details.filter((x) =>
      [x.AssetNo, x.AssetName, x.NoteText, x.CountedByName].join(" ").toLowerCase().includes(keyword),
    );
  }
  if (cca) details = details.filter((x) => x.CostCenterName.toLowerCase().includes(cca));
  if (group) details = details.filter((x) => x.AssetGroupName.toLowerCase().includes(group));
  if (location) details = details.filter((x) => x.LocationName.toLowerCase().includes(location));
  if (filters.Month) details = details.filter((x) => new Date(x.CountedAt).getMonth() + 1 === filters.Month);
  if (filters.DateFrom) details = details.filter((x) => x.CountedAt.slice(0, 10) >= filters.DateFrom!);
  if (filters.DateTo) details = details.filter((x) => x.CountedAt.slice(0, 10) <= filters.DateTo!);

  const prevYear = filters.StocktakeYear - 1;
  const prev = getMockStocktakeWorkspace(filters.PlantId, prevYear).records;
  const prevMap = new Map(prev.map((x) => [x.AssetNo, x.StatusCode]));

  const compareRows = details.map((row) => ({
    AssetNo: row.AssetNo,
    AssetName: row.AssetName,
    CurrentYearStatus: row.StatusCode,
    PreviousYearStatus: prevMap.get(row.AssetNo) || "-",
    NoteText: row.NoteText || "-",
  }));

  return {
    summary: workspace.summary,
    details,
    compareRows,
    previousYear: prevYear,
  };
}
