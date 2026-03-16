Mode hors ligne pour enregistrement de visites — IndexedDB + auto-sync au retour connexion

## Architecture
- `src/lib/offlineDb.ts` — CRUD IndexedDB (base: visit-offline-db, store: pending-recordings)
- `src/hooks/useOnlineStatus.ts` — hook navigator.onLine
- `src/hooks/useOfflineSync.ts` — auto-sync pipeline (upload → transcription → résumé) quand online
- `src/components/OnlineStatusIndicator.tsx` — badge wifi + popover file d'attente
- `VisitRecorder.tsx` — sauvegarde dans IndexedDB si hors ligne
- `AppLayout.tsx` — intègre indicateur + sync dans le header
