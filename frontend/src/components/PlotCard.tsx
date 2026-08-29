import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { plotIndexDescription } from '../data/plotDescriptions';

function stringifyCompact(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

export function PlotCard(props: {
  plotKey: string;
  plot: Record<string, unknown>;
  webpUrl?: string;
}) {
  const title = typeof props.plot.title === 'string' ? props.plot.title : props.plotKey;
  const description = plotIndexDescription(props.plotKey);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <CardContent>
        <Stack spacing={1.25}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.75 }}>
              {props.plotKey}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 720, letterSpacing: -0.2 }}>
              {title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, lineHeight: 1.65, letterSpacing: 0.01 }}
            >
              {description}
            </Typography>
          </Box>

          {props.webpUrl ? (
            <Box
              component="img"
              src={props.webpUrl}
              alt={title}
              sx={{
                width: '100%',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.10)',
                bgcolor: 'rgba(0,0,0,0.18)',
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No WebP URL for this plot (request without <code>savePlotsWebp</code> or server didn’t upload).
            </Typography>
          )}

          <Divider />

          <Box
            sx={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              bgcolor: 'rgba(0,0,0,0.22)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 2,
              p: 1.25,
              maxHeight: 320,
              overflow: 'auto',
            }}
          >
            {stringifyCompact(props.plot)}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
