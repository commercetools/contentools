import { Firestore } from '@google-cloud/firestore';
import CustomError from '../errors/custom.error';
import { Project } from '../types/service.types';
import { logger } from './logger.utils';

let firestoreClient: Firestore | null = null;

const PROJECTS_COLLECTION = 'projects';

/**
 * Initialize Firestore client
 */
export function initializeFirestore(): Firestore {
  if (firestoreClient) {
    return firestoreClient;
  }

  try {
    const projectId = process.env.GCP_PROJECT_ID;
    const databaseId = process.env.GCP_FIRESTORE_DATABASE_ID;
    const clientEmail = process.env.GCP_FIRESTORE_SERVICE_ACCOUNT_CLIENT_EMAIL;
    const privateKey = process.env.GCP_FIRESTORE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!projectId || !databaseId) {
      throw new Error(
        'GCP_PROJECT_ID and GCP_FIRESTORE_DATABASE_ID must be set'
      );
    }

    const config: any = {
      projectId,
      databaseId,
    };

    // Add credentials if provided (for local development)
    if (clientEmail && privateKey) {
      config.credentials = {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      };
    }

    firestoreClient = new Firestore(config);
    logger.info('Firestore client initialized successfully');

    return firestoreClient;
  } catch (error) {
    logger.error('Failed to initialize Firestore', error);
    throw new CustomError(500, 'Failed to initialize database connection');
  }
}

/**
 * Get Firestore client instance
 */
export function getFirestoreClient(): Firestore {
  if (!firestoreClient) {
    return initializeFirestore();
  }
  return firestoreClient;
}

/**
 * Get project by project key
 * @param projectKey - CommerceTools project key
 * @returns Project data or null if not found
 */
export async function getProjectByKey(
  projectKey: string
): Promise<Project | null> {
  try {
    const db = getFirestoreClient();
    const projectsCollection = db.collection(PROJECTS_COLLECTION);

    const docRef = projectsCollection.doc(projectKey);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();

    if (!data) {
      return null;
    }

    return {
      projectKey: data.projectKey,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      region: data.region,
      scope: data.scope,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastAccessedAt: data.lastAccessedAt?.toDate(),
    };
  } catch (error) {
    logger.error(`Failed to get project ${projectKey}`, error);
    throw new CustomError(500, 'Failed to retrieve project information');
  }
}

/**
 * Store or update project in Firestore
 * @param project - Project data to store
 */
export async function storeProject(
  project: Omit<Project, 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    const db = getFirestoreClient();
    const projectsCollection = db.collection(PROJECTS_COLLECTION);

    const docRef = projectsCollection.doc(project.projectKey);
    const doc = await docRef.get();

    const now = new Date();

    if (doc.exists) {
      // Update existing project
      await docRef.update({
        clientId: project.clientId,
        clientSecret: project.clientSecret,
        region: project.region,
        scope: project.scope,
        isActive: project.isActive,
        updatedAt: now,
        lastAccessedAt: project.lastAccessedAt || now,
      });
      logger.info(`Project ${project.projectKey} updated in Firestore`);
    } else {
      // Create new project
      await docRef.set({
        projectKey: project.projectKey,
        clientId: project.clientId,
        clientSecret: project.clientSecret,
        region: project.region,
        scope: project.scope,
        isActive: project.isActive,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: project.lastAccessedAt || now,
      });
      logger.info(`Project ${project.projectKey} created in Firestore`);
    }
  } catch (error) {
    logger.error(`Failed to store project ${project.projectKey}`, error);
    throw new CustomError(500, 'Failed to store project information');
  }
}

/**
 * Update project last accessed time
 * @param projectKey - Project key
 */
export async function updateProjectLastAccessed(
  projectKey: string
): Promise<void> {
  try {
    const db = getFirestoreClient();
    const projectsCollection = db.collection(PROJECTS_COLLECTION);

    const docRef = projectsCollection.doc(projectKey);
    await docRef.update({
      lastAccessedAt: new Date(),
    });
  } catch (error) {
    // Don't throw error for this operation, just log it
    logger.warn(
      `Failed to update last accessed time for project ${projectKey}`,
      error
    );
  }
}

/**
 * Delete project from Firestore
 * @param projectKey - Project key to delete
 */
export async function deleteProject(projectKey: string): Promise<void> {
  try {
    const db = getFirestoreClient();
    const projectsCollection = db.collection(PROJECTS_COLLECTION);

    await projectsCollection.doc(projectKey).delete();
    logger.info(`Project ${projectKey} deleted from Firestore`);
  } catch (error) {
    logger.error(`Failed to delete project ${projectKey}`, error);
    throw new CustomError(500, 'Failed to delete project');
  }
}
