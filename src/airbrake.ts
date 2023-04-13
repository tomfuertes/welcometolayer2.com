import { Notifier } from "@airbrake/node";

export const airbrake = new Notifier({
  projectId: parseInt(process.env.AIRBRAKE_PROJECT_ID as string, 10),
  projectKey: process.env.AIRBRAKE_PROJECT_KEY as string,
  environment: process.env.NODE_ENV,
});

airbrake.addFilter((notice) => {
  if (/production|staging/.test(process.env.NODE_ENV as string)) {
    return notice;
  } else {
    return null;
  }
});

export default airbrake;
