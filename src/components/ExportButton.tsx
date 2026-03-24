import { useStyletron } from "baseui";
import { useState } from "react";
import { Button, SIZE, KIND } from "baseui/button";
import { StatefulPopover, PLACEMENT } from "baseui/popover";
import { repAttainment, repL12DActivity, repPipeline, repCWnFT, repNDG, repCoaching, teamNDG, teamCWnFT, teamL12DActivity } from "../data/dashboardData";

function generateCSV(): string {
  const headers = ['Rep', 'Pts', 'Quota', 'Attn%', 'L12D Calls', 'Talk Time', 'Emails', 'Touchpoints', 'Open Opps', 'Stale', 'CW', 'CWnFT', 'CWnFT%', 'NDG%', 'RFO', 'Ads', 'Coaching Area', 'Urgency'];
  const rows = repAttainment.map(r => {
    const act = repL12DActivity.find(a => a.name === r.name);
    const pipe = repPipeline.find(p => p.name === r.name);
    const cw = repCWnFT.find(c => c.name === r.name);
    const ndg = repNDG.find(n => n.name === r.name);
    const coach = repCoaching.find(c => c.name === r.name);
    return [
      r.name, r.currentPts, r.quota, r.pctToQuota.toFixed(1),
      act?.totalCalls || 0, act?.totalTalkTime.toFixed(1) || 0, act?.totalEmails || 0, act?.totalTouchpoints || 0,
      pipe?.totalOpen || 0, pipe?.outOfDate || 0, cw?.totalCW || 0, cw?.cwnft || 0, cw?.pctNFT.toFixed(1) || 0,
      ndg?.ndgPct || 0, ndg?.rfo.toFixed(2) || 0, ndg?.ads.toFixed(2) || 0,
      coach?.primaryArea || '—', coach?.urgency || 0,
    ].join(',');
  });

  // Team summary row
  const teamRow = [
    'TEAM TOTAL',
    repAttainment.reduce((s, r) => s + r.currentPts, 0),
    repAttainment.reduce((s, r) => s + r.quota, 0),
    ((repAttainment.reduce((s, r) => s + r.currentPts, 0) / repAttainment.reduce((s, r) => s + r.quota, 0)) * 100).toFixed(1),
    teamL12DActivity.totalCalls, '', '', teamL12DActivity.totalTouchpoints,
    repPipeline.reduce((s, r) => s + r.totalOpen, 0),
    repPipeline.reduce((s, r) => s + r.outOfDate, 0),
    teamCWnFT.totalCW, teamCWnFT.cwnft, teamCWnFT.pctNFT,
    teamNDG.currentNDGPct, '', '', '', '',
  ].join(',');

  return [headers.join(','), ...rows, '', teamRow].join('\n');
}

function downloadCSV() {
  const csv = generateCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sabres-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF() {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const content = document.querySelector('[data-dashboard-content]') as HTMLElement;
  if (!content) return;

  const canvas = await html2canvas(content, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#FAFAFA',
    width: content.scrollWidth,
    height: content.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  // If content is taller than one page, split into pages
  const pageHeight = pdf.internal.pageSize.getHeight();
  let heightLeft = pdfHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = -(pdfHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`sabres-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
}

export default function ExportButton() {
  const [css] = useStyletron();
  const [exporting, setExporting] = useState(false);

  const handlePDF = async () => {
    setExporting(true);
    try {
      await downloadPDF();
    } finally {
      setExporting(false);
    }
  };

  return (
    <StatefulPopover
      placement={PLACEMENT.bottomRight}
      content={({ close }) => (
        <div className={css({ padding: '8px', minWidth: '160px' })}>
          <div
            onClick={() => { downloadCSV(); close(); }}
            className={css({
              padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'UberMoveText', ':hover': { backgroundColor: '#F0F0F0' },
            })}
          >
            📊 Export as CSV
          </div>
          <div
            onClick={() => { handlePDF(); close(); }}
            className={css({
              padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'UberMoveText', ':hover': { backgroundColor: '#F0F0F0' },
            })}
          >
            📄 Export as PDF
          </div>
        </div>
      )}
    >
      <Button
        size={SIZE.compact}
        kind={KIND.secondary}
        isLoading={exporting}
        overrides={{
          BaseButton: {
            style: {
              backgroundColor: '#333',
              color: '#FFF',
              ':hover': { backgroundColor: '#444' },
              fontSize: '12px',
              paddingLeft: '12px',
              paddingRight: '12px',
            },
          },
        }}
      >
        📥 Export
      </Button>
    </StatefulPopover>
  );
}
