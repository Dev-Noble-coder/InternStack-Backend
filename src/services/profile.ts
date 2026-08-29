export function calculateCompletion(profile: any) {
  const fields = [
    "phone",
    "bio",
    "address",
    "institution",
    "matricNumber",
    "faculty",
    "department",
    "level",
    "internshipType",
    "internshipStartPeriod",
    "internshipEndPeriod",
    "preferredLocations",
    "skills",
    "cv",
    "profilePictureUrl",
  ];
  const filled = fields.filter((field) => {
    const value = profile[field];
    return (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    );
  }).length;
  const completionPercentage = Math.round((filled / fields.length) * 100);
  return {
    completionPercentage,
    isReadyToApply: Boolean(
      profile.institution && profile.matricNumber && profile.cv?.url,
    ),
  };
}
