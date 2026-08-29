import { Application, Listing, StudentProfile } from "../models";
import { AppError } from "../errors";

export type VettingResult = {
  score: number;
  breakdown: {
    profileCompleteness: number;
    cvPresent: number;
    skillsMatch: number;
    eligibility: number;
  };
};

export async function calculateVettingScore(
  applicationId: string,
): Promise<VettingResult> {
  const application = await Application.findById(applicationId);
  if (!application)
    throw new AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
  const profile = await StudentProfile.findOne({
    userId: application.studentId,
  });
  const listing = await Listing.findById(application.listingId);
  if (!profile || !listing)
    throw new AppError(
      404,
      "Application data not found",
      "APPLICATION_DATA_NOT_FOUND",
    );
  const profileCompleteness = Math.round(
    ((profile.completionPercentage || 0) / 100) * 25,
  );
  const cvPresent = profile.cv?.url ? 25 : 0;
  const listingSkills = listing.skills || [];
  const studentSkills = new Set(
    (profile.skills || []).map((skill) => skill.toLowerCase()),
  );
  const matchCount = listingSkills.filter((skill) =>
    studentSkills.has(skill.toLowerCase()),
  ).length;
  const skillsMatch =
    listingSkills.length === 0
      ? 25
      : Math.min(25, Math.round((matchCount / listingSkills.length) * 25));
  const eligibility =
    !listing.internshipType || profile.internshipType === listing.internshipType
      ? 25
      : 0;
  const breakdown = {
    profileCompleteness,
    cvPresent,
    skillsMatch,
    eligibility,
  };
  const score = profileCompleteness + cvPresent + skillsMatch + eligibility;
  application.vettingScore = score;
  application.vettingBreakdown = breakdown;
  await application.save();
  return { score, breakdown };
}
