import { Router } from "express";
import * as controller from "../controllers/listingController";
export const createListingRouter = () => {
  const router = Router();
  router.get("/", controller.listListings);
  router.get("/:id", controller.getListing);
  return router;
};
