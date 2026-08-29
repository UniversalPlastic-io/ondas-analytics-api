# Frontend de analíticas — ONDAs

SPA de demostración del [ONDAs Analytics API](../README.md). Permite elegir un
punto y un radio sobre el mapa, un rango de fechas y un modo de agregación,
lanzar `POST /v1/analyses/run` y ver las gráficas e indicadores que devuelve.

Es un proyecto npm independiente del API: tiene su propio `package.json` y se
compila por separado.

## Arquitectura

```
src/
├── main.tsx                    punto de entrada
├── App.tsx                     estado de la consulta y orquestación de la vista
├── api/
│   ├── portalAuth.ts           POST /v1/auth/login
│   └── analyses.ts             POST /v1/analyses/run
├── components/
│   ├── PortalLoginDialog.tsx   login del portal
│   ├── MapPicker.tsx           selección de punto y radio (Leaflet)
│   ├── ControlsPanel.tsx       fechas, agregación y opciones de la petición
│   ├── ResultsView.tsx         indicadores devueltos
│   └── PlotCard.tsx            una gráfica con su descripción
├── data/plotDescriptions.ts    textos explicativos de cada gráfica
├── types/analyses.ts           tipos del contrato con el API
└── portalUsers.ts              sesión en sessionStorage (sólo el JWT)
```

Stack: React 18, TypeScript, Vite, MUI 5, TanStack Query, React Hook Form,
Leaflet / React-Leaflet.

### Estado del login

El flujo de login está **desactivado en el cliente**: en
[src/App.tsx](src/App.tsx) y [src/api/analyses.ts](src/api/analyses.ts) las
líneas marcadas con `// AUTH DISABLED` mantienen comentados el diálogo de acceso
y la inyección de la cabecera `Authorization`. El código de sesión
([portalUsers.ts](src/portalUsers.ts), [api/portalAuth.ts](src/api/portalAuth.ts))
sigue en el repositorio, listo para reactivarse.

Consecuencia práctica: tal cual, el SPA **no puede ejecutar
`POST /v1/analyses/run`**, porque ese endpoint del API exige Bearer y responde
401 sin token. Para usarlo hay que descomentar esas líneas. Los endpoints de
lectura (`/v1/overview`, `/v1/map/points`) sí funcionan sin token y devuelven el
agregado público.

Cuando el login está activo, el JWT se guarda en `sessionStorage` y viaja en
`Authorization: Bearer`. No se persisten credenciales en el cliente ni en el
código: usuario y contraseña sólo viajan en la llamada de login.

## Requisitos

- Node.js ≥ 18 y npm ≥ 9
- Una instancia del API accesible (ver [instalación del API](../README.md#3-instalación))

## Instalación y ejecución

```bash
cd frontend
npm ci
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:3000
npm run dev               # http://localhost:3001
```

El puerto 3001 es fijo (`strictPort: true` en [vite.config.ts](vite.config.ts))
para que no cambie de forma silenciosa si está ocupado.

### Variables

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | Base del API, sin barra final. En desarrollo `http://localhost:3000`; en producción, la URL pública (p. ej. `https://ondas.universalplastic.io/api`) |
| `VITE_BASE` | Subruta bajo la que se sirve el SPA. Por defecto `/`. En producción se usa `--base=/analyses/` en la línea de comandos |

## Ejemplo mínimo de uso

1. Reactivar el login: descomentar las líneas `// AUTH DISABLED` de
   [src/App.tsx](src/App.tsx) y [src/api/analyses.ts](src/api/analyses.ts).
2. `npm run dev`, con el API levantado en `http://localhost:3000`.
3. Iniciar sesión con un usuario de los que crea `npm run seed` en el API.
4. Pinchar un punto en el mapa y fijar el radio en km.
5. Elegir el rango de fechas y marcar la generación de gráficas.
6. *Ejecutar*: el SPA llama a `POST /v1/analyses/run` y muestra los resultados.

Si se omite el paso 1, la ejecución devuelve `401 Missing or invalid
Authorization header`.

## Compilación

```bash
npm run build                        # dist/ servido en la raíz
npm run build -- --base=/analyses/   # como en producción
npm run preview                      # comprueba el build localmente
npm run lint
```

`npm run build` ejecuta `tsc` antes de Vite, así que un error de tipos detiene la
compilación.

El despliegue del `dist/` resultante está descrito en
[docs/deployment/02-nginx-pm2.md](../docs/deployment/02-nginx-pm2.md):
se sincroniza con `rsync --delete` a la raíz web de Nginx.

## Licencia

Apache License 2.0, como el resto del repositorio. Ver [LICENSE](../LICENSE).
