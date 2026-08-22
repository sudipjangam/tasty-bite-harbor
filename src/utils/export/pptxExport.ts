import pptxgen from "pptxgenjs";
import { format } from "date-fns";
import { ReportData } from "@/hooks/useReportsData";
import {
  BRAND_ORANGE,
  BRAND_BLUE,
  BRAND_LIGHT,
  TEXT_DARK,
  TEXT_MUTED,
  formatColumnName,
  formatCellValue,
  getDisplayColumns,
} from "./exportConstants";

const BRAND_TAGLINE = "Empowering Restaurants, Enabling Growth";

export const generateEditablePPTX = async (
  reports: ReportData[],
  restaurantName: string | null,
  dateRange?: { from?: Date; to?: Date }
) => {
  const pptx = new pptxgen();

  pptx.author = "Swadeshi Solutions";
  pptx.company = "Swadeshi Solutions";
  pptx.title = "Business Report";
  pptx.layout = "LAYOUT_16x9";

  pptx.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: BRAND_BLUE } } },
      { rect: { x: 0, y: 0.15, w: "100%", h: 0.05, fill: { color: BRAND_ORANGE } } },
      { image: { x: 9.1, y: 0.25, w: 0.55, h: 0.3, path: "/swadeshi-logo.png" } },
      {
        text: {
          text: "SWADESHI SOLUTIONS",
          options: {
            x: 1.2,
            y: 2.0,
            w: 7.5,
            h: 1.5,
            color: "E8E8E8",
            fontSize: 36,
            bold: true,
            rotate: 330,
            align: "center",
          },
        },
      },
      {
        text: {
          text: "Powered by Swadeshi Solutions",
          options: {
            x: 0.5,
            y: "92%",
            w: "40%",
            h: 0.3,
            color: TEXT_MUTED,
            fontSize: 10,
          },
        },
      },
      {
        text: {
          text: "Slide ",
          options: {
            x: "85%",
            y: "92%",
            w: 1,
            h: 0.3,
            color: TEXT_MUTED,
            fontSize: 10,
            align: "right",
          },
        },
      },
    ],
    slideNumber: { x: "94%", y: "92%", color: TEXT_MUTED, fontSize: 10 },
  });

  // Cover Slide
  const coverSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: "30%",
    w: "100%",
    h: "40%",
    fill: { color: BRAND_LIGHT },
  });
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: "10%",
    y: "30%",
    w: 0.1,
    h: "40%",
    fill: { color: BRAND_ORANGE },
  });

  coverSlide.addImage({
    path: "/swadeshi-logo.png",
    x: 1.0,
    y: 0.5,
    w: 2.2,
    h: 1.2,
  });

  coverSlide.addText("BUSINESS REPORT", {
    x: 1,
    y: "36%",
    w: "80%",
    h: 0.8,
    fontSize: 40,
    bold: true,
    color: BRAND_BLUE,
  });

  coverSlide.addText(restaurantName || "Restaurant Performance", {
    x: 1,
    y: "48%",
    w: "80%",
    h: 0.5,
    fontSize: 22,
    color: TEXT_DARK,
  });

  const dateText =
    dateRange?.from && dateRange?.to
      ? `Period: ${format(dateRange.from, "MMM dd, yyyy")} - ${format(
          dateRange.to,
          "MMM dd, yyyy"
        )}`
      : `Generated: ${format(new Date(), "MMM dd, yyyy")}`;

  coverSlide.addText(dateText, {
    x: 1,
    y: "55%",
    w: "80%",
    h: 0.4,
    fontSize: 13,
    color: TEXT_MUTED,
  });

  coverSlide.addText("Swadeshi Solutions • " + BRAND_TAGLINE, {
    x: 1,
    y: "62%",
    w: "80%",
    h: 0.4,
    fontSize: 11,
    italic: true,
    color: BRAND_ORANGE,
  });

  // Report Slides
  for (const report of reports) {
    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });

    slide.addText(report.title, {
      x: 0.5,
      y: 0.4,
      w: "80%",
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: BRAND_BLUE,
    });

    let kpiY = 1.2;
    const summaryEntries = Object.entries(report.summary);

    summaryEntries.forEach(([key, value]) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: kpiY,
        w: 3,
        h: 0.8,
        fill: { color: BRAND_LIGHT },
        line: { color: "E2E8F0", width: 1 },
        rectRadius: 0.1,
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: kpiY,
        w: 0.05,
        h: 0.8,
        fill: { color: BRAND_ORANGE },
      });
      slide.addText(key.toUpperCase(), {
        x: 0.6,
        y: kpiY + 0.1,
        w: 2.8,
        h: 0.3,
        fontSize: 10,
        color: TEXT_MUTED,
        bold: true,
      });
      slide.addText(String(value), {
        x: 0.6,
        y: kpiY + 0.4,
        w: 2.8,
        h: 0.4,
        fontSize: 18,
        color: TEXT_DARK,
        bold: true,
      });

      kpiY += 0.95;
    });

    if (report.chartData && report.chartData.length > 0) {
      const isPie = report.chartData.length <= 6;
      const chartLabels = report.chartData.map((d) => String(d.name));
      const chartValues = report.chartData.map((d) => Number(d.value) || 0);

      const pptxChartData = [
        {
          name: "Data",
          labels: chartLabels,
          values: chartValues,
        },
      ];

      if (isPie) {
        slide.addChart(pptx.ChartType.doughnut, pptxChartData, {
          x: 4.0,
          y: 1.2,
          w: 5.5,
          h: 3.5,
          showLegend: true,
          legendPos: "r",
          holeSize: 50,
        });
      } else {
        slide.addChart(pptx.ChartType.bar, pptxChartData, {
          x: 4.0,
          y: 1.2,
          w: 5.5,
          h: 3.5,
          showLegend: false,
          barDir: "col",
          chartColors: [
            BRAND_BLUE,
            BRAND_ORANGE,
            "38BDF8",
            "34D399",
            "A78BFA",
          ],
          showValue: true,
          valGridLine: { color: "E2E8F0", style: "dash" },
        });
      }
    }

    if (report.tableData && report.tableData.length > 0) {
      const columns = getDisplayColumns(
        report.tableData as Record<string, unknown>[]
      ).slice(0, 6);
      const ROWS_PER_SLIDE = 12;
      const totalDataRows = report.tableData.length;
      const totalTableSlides = Math.ceil(totalDataRows / ROWS_PER_SLIDE);

      for (let slideIdx = 0; slideIdx < totalTableSlides; slideIdx++) {
        const tableSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        const pageLabel =
          totalTableSlides > 1 ? ` (${slideIdx + 1}/${totalTableSlides})` : "";

        tableSlide.addText(`${report.title} - Data Table${pageLabel}`, {
          x: 0.5,
          y: 0.4,
          w: "80%",
          h: 0.5,
          fontSize: 20,
          bold: true,
          color: BRAND_BLUE,
        });

        const tableRows: pptxgen.TableRow[] = [
          columns.map((key) => ({
            text: formatColumnName(key),
            options: {
              fill: { color: BRAND_BLUE },
              color: "FFFFFF",
              bold: true,
              fontFace: "Helvetica",
              fontSize: 11,
              align: "left",
            },
          })),
        ];

        const sliceStart = slideIdx * ROWS_PER_SLIDE;
        const sliceEnd = Math.min(sliceStart + ROWS_PER_SLIDE, totalDataRows);
        report.tableData.slice(sliceStart, sliceEnd).forEach((row, rowIndex) => {
          const isAlternate = rowIndex % 2 === 1;
          const rowProps = {
            fill: { color: isAlternate ? "F8FAFC" : "FFFFFF" },
            color: TEXT_DARK,
            fontSize: 10,
            border: { type: "solid" as const, color: "E2E8F0", pt: 1 },
            fontFace: "Helvetica",
            align: "left" as const,
            bold: false as const,
          };

          tableRows.push(
            columns.map((col) => ({
              text: String(
                formatCellValue((row as Record<string, unknown>)[col])
              ).substring(0, 40),
              options: rowProps,
            }))
          );
        });

        tableSlide.addTable(tableRows, {
          x: 0.5,
          y: 1.2,
          w: 9.0,
          rowH: 0.3,
          valign: "middle",
        });

        tableSlide.addText(
          `Showing ${sliceStart + 1}\u2013${sliceEnd} of ${totalDataRows} records`,
          {
            x: 0.5,
            y: 5.0,
            w: 9.0,
            h: 0.3,
            fontSize: 9,
            color: TEXT_MUTED,
            italic: true,
          }
        );
      }
    }
  }

  const fileName = `${restaurantName || "Business"}_Report_${format(
    new Date(),
    "yyyy-MM-dd"
  )}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
};
