import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import type { AnalysesRunResponse } from '../types/analyses';
import { PlotCard } from './PlotCard';

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function plotKeySort(a: string, b: string): number {
  const ax = Number(a.split('_', 1)[0]);
  const bx = Number(b.split('_', 1)[0]);
  if (Number.isFinite(ax) && Number.isFinite(bx) && ax !== bx) return ax - bx;
  return a.localeCompare(b);
}

export function ResultsView(props: { response: AnalysesRunResponse }) {
  const r = props.response;
  const plots = r.dataFormattedForPlots?.plots ?? {};
  const plotKeys = Object.keys(plots).sort(plotKeySort);

  return (
    <Stack spacing={2}>
      {r.warnings?.length ? (
        <Alert severity="warning" variant="outlined">
          <Stack spacing={0.5}>
            {r.warnings.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </Stack>
        </Alert>
      ) : null}

      <Card
        variant="outlined"
        sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}
      >
        <CardContent>
          <Stack spacing={1.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 750, letterSpacing: -0.2 }}>
                  Run summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  requestId: <code>{r.requestId}</code>
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ pt: { xs: 1, sm: 0 }, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={() => downloadJson(`analyses-${r.requestId}.json`, r)}
                  sx={{ borderRadius: 2 }}
                >
                  Download raw JSON
                </Button>
                <Button
                  variant="contained"
                  disabled={!r.plotPdfUrl}
                  component="a"
                  href={r.plotPdfUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ borderRadius: 2, fontWeight: 750 }}
                >
                  Download PDF
                </Button>
              </Stack>
            </Stack>

            <Divider />

            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <Typography variant="overline" sx={{ opacity: 0.75 }}>
                  Applied date range
                </Typography>
                <Typography variant="body2">
                  <code>{r.meta.dateRangeApplied.start}</code> → <code>{r.meta.dateRangeApplied.end}</code>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="overline" sx={{ opacity: 0.75 }}>
                  Aggregation
                </Typography>
                <Typography variant="body2">
                  <code>{r.meta.aggregation.mode}</code>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="overline" sx={{ opacity: 0.75 }}>
                  Executed analyses
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {r.executedAnalyses.map((a) => (
                    <Chip key={a} size="small" label={a} sx={{ mb: 0.5 }} />
                  ))}
                </Stack>
              </Grid>
            </Grid>

            <Divider />

            <Box>
              <Typography variant="overline" sx={{ opacity: 0.75 }}>
                Datasets used
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {Object.entries(r.meta.datasetsUsed).map(([k, v]) => (
                  <Chip key={k} size="small" label={`${k}: ${v}`} sx={{ mb: 0.5 }} />
                ))}
              </Stack>
            </Box>

            {r.meta.cache ? (
              <>
                <Divider />
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.75 }}>
                    Cache
                  </Typography>
                  <Typography variant="body2">
                    mode: <code>{r.meta.cache.mode}</code> · hit: <code>{String(r.meta.cache.hit)}</code>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                    key: <code>{r.meta.cache.cacheKey}</code>
                  </Typography>
                </Box>
              </>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 750, letterSpacing: -0.2 }}>
            Plots
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {plotKeys.length} plot(s)
          </Typography>
        </Stack>
      </Box>

      {plotKeys.length === 0 ? (
        <Alert severity="info" variant="outlined">
          No plot payload. Enable <code>dataFormattedForPlots</code> and/or <code>savePlotsWebp</code>.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {plotKeys.map((key) => (
            <PlotCard
              key={key}
              plotKey={key}
              plot={plots[key] as Record<string, unknown>}
              webpUrl={r.plotWebpPaths?.[key]}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

