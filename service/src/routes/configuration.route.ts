import { Router, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.utils';
import * as ConfigurationController from '../controllers/configuration.controller';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';
import { AuthenticatedRequest } from '../types/service.types';

const configurationRouter = Router();

configurationRouter.get(
  '/:businessUnitKey/configuration/theme',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const theme = await ConfigurationController.getTheme(
        req,
        businessUnitKey
      );
      res.status(200).json(theme);
    } catch (error) {
      logger.error('Failed to get configuration theme:', error);
      next(error);
    }
  }
);

configurationRouter.get(
  '/:businessUnitKey/configuration',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const config =
        await ConfigurationController.getAllConfigurations(
          req,
          businessUnitKey
        );
      res.status(200).json(config);
    } catch (error) {
      logger.error('Failed to get configurations:', error);
      next(error);
    }
  }
);

configurationRouter.get(
  '/:businessUnitKey/configurations',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const config =
        await ConfigurationController.getAllConfigurations(
          req,
          businessUnitKey
        );
      res.status(200).json(config);
    } catch (error) {
      logger.error('Failed to get configurations:', error);
      next(error);
    }
  }
);

configurationRouter.post(
  '/:businessUnitKey/configuration/theme',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const theme = await ConfigurationController.createTheme(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(theme);
    } catch (error) {
      logger.error('Failed to create configuration theme:', error);
      next(error);
    }
  }
);

configurationRouter.put(
  '/:businessUnitKey/configuration/theme',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const theme = await ConfigurationController.updateTheme(
        req,
        businessUnitKey,
        value
      );
      res.json(theme);
    } catch (error) {
      logger.error('Failed to update configuration theme:', error);
      next(error);
    }
  }
);

configurationRouter.delete(
  '/:businessUnitKey/configuration/theme',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteTheme(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration theme:', error);
      next(error);
    }
  }
);

// Header configuration
configurationRouter.get(
  '/:businessUnitKey/configuration/header',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const header = await ConfigurationController.getHeader(
        req,
        businessUnitKey
      );
      res.status(200).json(header);
    } catch (error) {
      logger.error('Failed to get configuration header:', error);
      next(error);
    }
  }
);

configurationRouter.post(
  '/:businessUnitKey/configuration/header',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const header = await ConfigurationController.createHeader(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(header);
    } catch (error) {
      logger.error('Failed to create configuration header:', error);
      next(error);
    }
  }
);

configurationRouter.put(
  '/:businessUnitKey/configuration/header',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const header = await ConfigurationController.updateHeader(
        req,
        businessUnitKey,
        value
      );
      res.json(header);
    } catch (error) {
      logger.error('Failed to update configuration header:', error);
      next(error);
    }
  }
);

configurationRouter.delete(
  '/:businessUnitKey/configuration/header',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteHeader(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration header:', error);
      next(error);
    }
  }
);

// Facet configuration
configurationRouter.get(
  '/:businessUnitKey/configuration/facet',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const facet = await ConfigurationController.getFacet(req, businessUnitKey);
      res.status(200).json(facet);
    } catch (error) {
      logger.error('Failed to get configuration facet:', error);
      next(error);
    }
  }
);
configurationRouter.post(
  '/:businessUnitKey/configuration/facet',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const facet = await ConfigurationController.createFacet(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(facet);
    } catch (error) {
      logger.error('Failed to create configuration facet:', error);
      next(error);
    }
  }
);
configurationRouter.put(
  '/:businessUnitKey/configuration/facet',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const facet = await ConfigurationController.updateFacet(
        req,
        businessUnitKey,
        value
      );
      res.json(facet);
    } catch (error) {
      logger.error('Failed to update configuration facet:', error);
      next(error);
    }
  }
);
configurationRouter.delete(
  '/:businessUnitKey/configuration/facet',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteFacet(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration facet:', error);
      next(error);
    }
  }
);

// Footer configuration
configurationRouter.get(
  '/:businessUnitKey/configuration/footer',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const footer = await ConfigurationController.getFooter(req, businessUnitKey);
      res.status(200).json(footer);
    } catch (error) {
      logger.error('Failed to get configuration footer:', error);
      next(error);
    }
  }
);
configurationRouter.post(
  '/:businessUnitKey/configuration/footer',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const footer = await ConfigurationController.createFooter(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(footer);
    } catch (error) {
      logger.error('Failed to create configuration footer:', error);
      next(error);
    }
  }
);
configurationRouter.put(
  '/:businessUnitKey/configuration/footer',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const footer = await ConfigurationController.updateFooter(
        req,
        businessUnitKey,
        value
      );
      res.json(footer);
    } catch (error) {
      logger.error('Failed to update configuration footer:', error);
      next(error);
    }
  }
);
configurationRouter.delete(
  '/:businessUnitKey/configuration/footer',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteFooter(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration footer:', error);
      next(error);
    }
  }
);

// Site metadata configuration
configurationRouter.get(
  '/:businessUnitKey/configuration/site-metadata',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const siteMetadata = await ConfigurationController.getSiteMetadata(
        req,
        businessUnitKey
      );
      res.status(200).json(siteMetadata);
    } catch (error) {
      logger.error('Failed to get configuration site-metadata:', error);
      next(error);
    }
  }
);
configurationRouter.post(
  '/:businessUnitKey/configuration/site-metadata',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const siteMetadata = await ConfigurationController.createSiteMetadata(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(siteMetadata);
    } catch (error) {
      logger.error('Failed to create configuration site-metadata:', error);
      next(error);
    }
  }
);
configurationRouter.put(
  '/:businessUnitKey/configuration/site-metadata',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const siteMetadata = await ConfigurationController.updateSiteMetadata(
        req,
        businessUnitKey,
        value
      );
      res.json(siteMetadata);
    } catch (error) {
      logger.error('Failed to update configuration site-metadata:', error);
      next(error);
    }
  }
);
configurationRouter.delete(
  '/:businessUnitKey/configuration/site-metadata',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteSiteMetadata(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration site-metadata:', error);
      next(error);
    }
  }
);

// Category listing configuration
configurationRouter.get(
  '/:businessUnitKey/configuration/category-listing',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const categoryListing = await ConfigurationController.getCategoryListing(
        req,
        businessUnitKey
      );
      res.status(200).json(categoryListing);
    } catch (error) {
      logger.error('Failed to get configuration category-listing:', error);
      next(error);
    }
  }
);
configurationRouter.post(
  '/:businessUnitKey/configuration/category-listing',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const categoryListing =
        await ConfigurationController.createCategoryListing(
          req,
          businessUnitKey,
          value
        );
      res.status(201).json(categoryListing);
    } catch (error) {
      logger.error('Failed to create configuration category-listing:', error);
      next(error);
    }
  }
);
configurationRouter.put(
  '/:businessUnitKey/configuration/category-listing',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const categoryListing =
        await ConfigurationController.updateCategoryListing(
          req,
          businessUnitKey,
          value
        );
      res.json(categoryListing);
    } catch (error) {
      logger.error('Failed to update configuration category-listing:', error);
      next(error);
    }
  }
);
configurationRouter.delete(
  '/:businessUnitKey/configuration/category-listing',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteCategoryListing(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration category-listing:', error);
      next(error);
    }
  }
);

// Translations configuration
configurationRouter.get(
  '/:businessUnitKey/configuration/translations',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const translations = await ConfigurationController.getTranslations(
        req,
        businessUnitKey
      );
      res.status(200).json(translations);
    } catch (error) {
      logger.error('Failed to get configuration translations:', error);
      next(error);
    }
  }
);
configurationRouter.post(
  '/:businessUnitKey/configuration/translations',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const translations = await ConfigurationController.createTranslations(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(translations);
    } catch (error) {
      logger.error('Failed to create configuration translations:', error);
      next(error);
    }
  }
);
configurationRouter.put(
  '/:businessUnitKey/configuration/translations',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const translations = await ConfigurationController.updateTranslations(
        req,
        businessUnitKey,
        value
      );
      res.json(translations);
    } catch (error) {
      logger.error('Failed to update configuration translations:', error);
      next(error);
    }
  }
);
configurationRouter.delete(
  '/:businessUnitKey/configuration/translations',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteTranslations(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration translations:', error);
      next(error);
    }
  }
);

// B2B account menu links configuration
configurationRouter.get(
  '/:businessUnitKey/configuration/b2b-account-menu-links',
  requireProjectKey,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      const b2bAccountMenuLinks = await ConfigurationController.getB2bAccountMenuLinks(
        req,
        businessUnitKey
      );
      res.status(200).json(b2bAccountMenuLinks);
    } catch (error) {
      logger.error('Failed to get configuration b2b-account-menu-links:', error);
      next(error);
    }
  }
);
configurationRouter.post(
  '/:businessUnitKey/configuration/b2b-account-menu-links',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const b2bAccountMenuLinks = await ConfigurationController.createB2bAccountMenuLinks(
        req,
        businessUnitKey,
        value
      );
      res.status(201).json(b2bAccountMenuLinks);
    } catch (error) {
      logger.error('Failed to create configuration b2b-account-menu-links:', error);
      next(error);
    }
  }
);
configurationRouter.put(
  '/:businessUnitKey/configuration/b2b-account-menu-links',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { value } = req.body;
      const { businessUnitKey } = req.params;
      const b2bAccountMenuLinks = await ConfigurationController.updateB2bAccountMenuLinks(
        req,
        businessUnitKey,
        value
      );
      res.json(b2bAccountMenuLinks);
    } catch (error) {
      logger.error('Failed to update configuration b2b-account-menu-links:', error);
      next(error);
    }
  }
);
configurationRouter.delete(
  '/:businessUnitKey/configuration/b2b-account-menu-links',
  validateJwt,
  validateProject,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessUnitKey } = req.params;
      await ConfigurationController.deleteB2bAccountMenuLinks(req, businessUnitKey);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete configuration b2b-account-menu-links:', error);
      next(error);
    }
  }
);

export default configurationRouter;
