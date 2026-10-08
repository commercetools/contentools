import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { getFirestoreClient } from '../utils/firestore.utils';
import {
  isBuiltInDatasource,
  resolveDatasource,
} from '../controllers/datasource-resolution.route';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';
import { AuthenticatedRequest } from '../types/service.types';

const datasourceRouter = Router();

function getDatasourcesCollection(projectKey: string) {
  return getFirestoreClient()
    .collection('projects')
    .doc(projectKey)
    .collection('datasources');
}

// List all datasources
datasourceRouter.get('/datasource', requireProjectKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const snapshot = await getDatasourcesCollection(req.project!.projectKey).get();
    res.json(snapshot.docs.map((doc) => ({ key: doc.id, value: doc.data().value })));
  } catch (error) {
    logger.error('Failed to get datasources:', error);
    next(error);
  }
});

// Get a single datasource by key
datasourceRouter.get('/datasource/:key', requireProjectKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { key } = req.params;
    const doc = await getDatasourcesCollection(req.project!.projectKey).doc(key).get();
    if (!doc.exists) {
      res.status(404).json({ error: `Datasource '${key}' not found` });
      return;
    }
    res.json({ key: doc.id, value: doc.data()!.value });
  } catch (error) {
    logger.error(`Failed to get datasource '${req.params.key}':`, error);
    next(error);
  }
});

// Create a datasource (fails if key already exists)
datasourceRouter.post('/datasource/:key', validateJwt, validateProject, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const docRef = getDatasourcesCollection(req.project!.projectKey).doc(key);
    const existing = await docRef.get();
    if (existing.exists) {
      res.status(400).json({ error: `Datasource '${key}' already exists` });
      return;
    }
    await docRef.set({ value, createdAt: new Date(), updatedAt: new Date() });
    res.status(201).json({ key, value });
  } catch (error) {
    logger.error(`Failed to create datasource '${req.params.key}':`, error);
    next(error);
  }
});

// Update a datasource
datasourceRouter.put('/datasource/:key', validateJwt, validateProject, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await getDatasourcesCollection(req.project!.projectKey).doc(key).set({ value, updatedAt: new Date() }, { merge: true });
    res.json({ key, value });
  } catch (error) {
    logger.error(`Failed to update datasource '${req.params.key}':`, error);
    next(error);
  }
});

// Delete a datasource
datasourceRouter.delete('/datasource/:key', validateJwt, validateProject, async (req: AuthenticatedRequest, res, next) => {
  try {
    await getDatasourcesCollection(req.project!.projectKey).doc(req.params.key).delete();
    res.status(204).send();
  } catch (error) {
    logger.error(`Failed to delete datasource '${req.params.key}':`, error);
    next(error);
  }
});

// Test / resolve a datasource with supplied params
datasourceRouter.post('/datasource/:key/test', validateJwt, validateProject, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { key } = req.params;
    // Built-in datasources (product-by-sku / products-by-sku) resolve via the
    // commercetools API and don't require a registered Firestore document.
    if (!isBuiltInDatasource(key)) {
      const doc = await getDatasourcesCollection(req.project!.projectKey).doc(key).get();
      if (!doc.exists) {
        res.status(404).json({ error: `Datasource '${key}' not found` });
        return;
      }
    }
    const { params } = req.body;
    const result = await resolveDatasource(req, key, params);
    res.json(result);
  } catch (error) {
    logger.error(`Failed to test datasource '${req.params.key}':`, error);
    next(error);
  }
});

export default datasourceRouter;
