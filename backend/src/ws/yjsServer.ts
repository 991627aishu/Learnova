import { WebSocketServer } from "ws";
import * as Y from "yjs";
import { setupWSConnection, docs } from "y-websocket/bin/utils";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();
const syncIntervals = new Map<string, NodeJS.Timeout>();

// Load the document from PostgreSQL snapshots + updates
async function loadDocumentFromDB(docName: string): Promise<Y.Doc> {
  const doc = new Y.Doc();
  
  // 1. Fetch latest snapshot
  const snapshot = await prisma.yjsSnapshot.findFirst({
    where: { docName },
    orderBy: { version: 'desc' }
  });

  if (snapshot) {
    Y.applyUpdate(doc, new Uint8Array(snapshot.state));
  }

  // 2. Fetch trailing updates applied after the snapshot
  const updates = await prisma.yjsUpdate.findMany({
    where: { 
      docName, 
      createdAt: { gt: snapshot?.createdAt || new Date(0) }
    },
    orderBy: { createdAt: 'asc' }
  });

  // 3. Incrementally apply deltas to state
  for (const row of updates) {
    Y.applyUpdate(doc, new Uint8Array(row.update));
  }

  return doc;
}

export function createYjsServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    if (!request.url?.startsWith("/yjs/")) return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", async (ws, req) => {
    const docName = req.url!.split("/yjs/")[1];
    
    // Check if doc exists in Memory, if not, Bootstrap it from DB!
    if (!docs.has(docName)) {
      const dbDoc = await loadDocumentFromDB(docName);
      docs.set(docName, dbDoc);

      let updateCount = 0;
      const SNAPSHOT_THRESHOLD = 50;

      // Listen to newly broadcasted updates and flush cleanly into Postgres Bytes column
      dbDoc.on('update', async (update: Uint8Array) => {
        try {
          // Persist the delta operation for 100% loss-less versioning histories
          await prisma.yjsUpdate.create({
            data: {
               docName,
               update: Buffer.from(update)
            }
          });

          updateCount++;
          if (updateCount >= SNAPSHOT_THRESHOLD) {
            updateCount = 0;
            const stateVector = Y.encodeStateAsUpdate(dbDoc);
            
            await prisma.$transaction(async (tx) => {
              const latestSnapshot = await tx.yjsSnapshot.findFirst({
                where: { docName },
                orderBy: { version: 'desc' }
              });
              const newVersion = (latestSnapshot?.version || 0) + 1;
              const snapshotParams = { docName, state: Buffer.from(stateVector), version: newVersion };
              
              await tx.yjsSnapshot.create({ data: snapshotParams });
              await tx.yjsUpdate.deleteMany({ where: { docName, createdAt: { lt: new Date() } } });
            });
            logger.info(`Created snapshot v${updateCount} for ${docName}`);
          }
        } catch (e: any) {
          logger.error(`Failed persisting Yjs Delta to PostgreSQL: ${e.message}`);
        }
      });
    }

    setupWSConnection(ws, req, { docName });

    const [_, projectId, __, fileId] = docName.split("/");
    if (fileId && !syncIntervals.has(docName)) {
      // Periodic text extractor just for native DB fast-queries if needed (fallback)
      const interval = setInterval(async () => {
        const doc = docs.get(docName);
        if (doc) {
           const text = doc.getText("monaco").toString();
           if (text) await prisma.latexFile.update({ where: { id: fileId }, data: { content: text } }).catch(()=>{});
        }
      }, 10000);
      syncIntervals.set(docName, interval);
    }
    
    ws.on("close", async () => {
      const doc = docs.get(docName);
      if (!doc || ((doc as any).conns?.size || 0) === 0) {
        clearInterval(syncIntervals.get(docName));
        syncIntervals.delete(docName);

        // Final snapshot before GC
        if (doc) {
           try {
              const stateVector = Y.encodeStateAsUpdate(doc);
              await prisma.$transaction(async (tx) => {
                const latestSnapshot = await tx.yjsSnapshot.findFirst({
                  where: { docName },
                  orderBy: { version: 'desc' }
                });
                const newVersion = (latestSnapshot?.version || 0) + 1;
                await tx.yjsSnapshot.create({
                  data: { docName, state: Buffer.from(stateVector), version: newVersion }
                });
                await tx.yjsUpdate.deleteMany({ where: { docName } });
              });
              logger.info(`Final GC snapshot created for ${docName}`);
           } catch (e: any) {
              logger.error(`Failed final snapshot GC for ${docName}: ${e.message}`);
           }
        }

        // CRITICAL SCALE FIX: Free RAM instead of leaking massive Binary Documents tracking arrays infinitely
        docs.delete(docName);
      }
    });
  });

  logger.info("WebSocket PostgreSQL-Persisted Yjs Server running on /yjs/*");
}
