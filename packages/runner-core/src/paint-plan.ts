import { type BrowserSession } from "@cua-sample/browser-runtime";
import { type PaintGrid } from "@cua-sample/scenario-kit";

export type PaintSaveRecord =
  | {
      checksum: string;
      paintedCellCount: number;
    }
  | null;

function cloneGrid(grid: PaintGrid): PaintGrid {
  return JSON.parse(JSON.stringify(grid)) as PaintGrid;
}

function countPaintedCells(grid: PaintGrid) {
  return grid.flat().filter((cell) => cell !== "blank").length;
}

async function readPaintValue<T>(
  session: BrowserSession,
  accessorName: "__paintReadCanvasGrid" | "__paintReadSaveRecord",
) {
  return session.page.evaluate((name) => {
    const scope = globalThis as unknown as Record<string, (() => T) | undefined>;
    const accessor = scope[name];

    if (typeof accessor !== "function") {
      throw new Error(`Paint accessor ${name} is unavailable.`);
    }

    return accessor();
  }, accessorName);
}

export async function readPaintCanvasGrid(session: BrowserSession) {
  return cloneGrid(await readPaintValue<PaintGrid>(session, "__paintReadCanvasGrid"));
}

export async function readPaintSaveRecord(session: BrowserSession) {
  return readPaintValue<PaintSaveRecord>(session, "__paintReadSaveRecord");
}

export async function assertPaintOutcome(session: BrowserSession) {
  await session.page.waitForFunction(() => {
    const scope = globalThis as unknown as {
      __paintLabReady?: boolean;
      __paintReadSaveRecord?: () => PaintSaveRecord;
    };

    return scope.__paintLabReady === true && scope.__paintReadSaveRecord?.() != null;
  });

  const [canvasGrid, saveRecord] = await Promise.all([
    readPaintCanvasGrid(session),
    readPaintSaveRecord(session),
  ]);

  if (!saveRecord) {
    throw new Error(
      "Paint verification failed. Saved artwork record was missing.",
    );
  }

  const currentChecksum = canvasGrid.map((row) => row.join("-")).join("/");

  if (saveRecord.checksum !== currentChecksum) {
    throw new Error(
      [
        "Paint verification failed.",
        "Saved checksum did not match the live canvas checksum.",
        `Observed ${saveRecord.checksum}.`,
        `Live ${currentChecksum}.`,
      ].join(" "),
    );
  }

  const paintedCellCount = countPaintedCells(canvasGrid);

  if (saveRecord.paintedCellCount !== paintedCellCount) {
    throw new Error(
      [
        "Paint verification failed.",
        "Saved painted-cell count did not match the live canvas.",
        `Observed ${saveRecord.paintedCellCount}.`,
        `Live ${paintedCellCount}.`,
      ].join(" "),
    );
  }

  if (paintedCellCount <= 0) {
    throw new Error(
      "Paint verification failed. The saved artwork was blank.",
    );
  }
}
