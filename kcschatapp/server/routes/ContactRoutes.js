import { Router } from "express";
import {
  getAllContacts,
  getContactsForList,
  searchContacts,
} from "../controllers/ContacsControllers.js"; // Note: Typo in original filename 'ContacsControllers.js'
import { ensureAuthenticated } from "../middlewares/AuthMiddleware.js"; // Updated import

const contactsRoutes = Router();

contactsRoutes.post("/search", ensureAuthenticated, searchContacts); // Updated middleware
contactsRoutes.get("/all-contacts", ensureAuthenticated, getAllContacts); // Updated middleware
contactsRoutes.get("/get-contacts-for-list", ensureAuthenticated, getContactsForList); // Updated middleware

export default contactsRoutes;
