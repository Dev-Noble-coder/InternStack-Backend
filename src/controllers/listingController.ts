import { Request, Response, NextFunction } from "express";
import { Listing } from "../models";
import { AppError, badRequest } from "../errors";
const paging = (r: Request) => {
  const page = Number(r.query.page ?? 1),
    limit = Number(r.query.limit ?? 20);
  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1
  )
    throw badRequest("page and limit must be valid integers");
  return { page, limit: Math.min(100, limit) };
};
export async function listListings(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { page, limit } = paging(request);
    const filter: any = { status: "published" };
    if (request.query.location) filter.locations = request.query.location;
    if (request.query.internshipType)
      filter.internshipType = request.query.internshipType;
    if (request.query.workMode) filter.workMode = request.query.workMode;
    if (request.query.category) filter.category = request.query.category;
    if (request.query.search)
      filter.$text = { $search: String(request.query.search) };
    const [items, total] = await Promise.all([
      Listing.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("companyId", "name logo website")
        .lean(),
      Listing.countDocuments(filter),
    ]);
    response.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1,
        },
      },
    });
  } catch (e) {
    next(e);
  }
}
export async function getListing(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const listing = await Listing.findById(request.params.id)
      .populate("companyId", "name logo website")
      .lean();
    if (!listing)
      throw new AppError(404, "Listing not found", "LISTING_NOT_FOUND");
    response.json({ success: true, data: listing });
  } catch (e) {
    next(e);
  }
}
