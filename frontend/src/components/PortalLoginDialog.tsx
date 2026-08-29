import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { portalLogin } from '../api/portalAuth';
import { writePortalSession } from '../portalUsers';
import { indicesDocumentationUrl } from '../api/analyses';

type Props = {
  open: boolean;
  onSuccess: (username: string) => void;
};

export function PortalLoginDialog(props: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const session = await portalLogin(username, password);
      writePortalSession(session);
      props.onSuccess(session.username);
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de acceso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={props.open}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'rgba(12, 18, 36, 0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          backgroundImage: 'linear-gradient(180deg, rgba(143,184,255,0.06), transparent 40%)',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 780, letterSpacing: -0.3, pb: 0 }}>
        Acceso ONDAs — conectores
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            fullWidth
            size="small"
            disabled={loading}
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            fullWidth
            size="small"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) void submit();
            }}
          />

          {error ? (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          ) : null}

          <Button
            variant="contained"
            size="large"
            onClick={() => void submit()}
            disabled={loading}
            sx={{ fontWeight: 750, py: 1.25 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
          </Button>

          <Typography variant="caption" color="text.secondary">
            Documentación de índices (API):{' '}
            <Link href={indicesDocumentationUrl()} target="_blank" rel="noreferrer" underline="hover">
              {indicesDocumentationUrl()}
            </Link>
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
