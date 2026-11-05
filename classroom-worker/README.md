# Classroom service

The Worker provides short-lived classes for the induction activity. A class code is
for joining; the teacher's separate key stays in the creating browser. Clearing that
browser's site data loses access to the teacher dashboard. A participant has a
separate key stored in their browser. Use nicknames rather than personal details.

The teacher can release the two stages and close a class. Closing deletes its stored
progress. Cloudflare schedules deletion after seven days. The dashboard is tied to
the browser that created the class; cross-device teacher sign-in is not provided.

Deploy this Worker to the site owner's Cloudflare account. Set the repository
variable `VITE_CLASSROOM_API` to the deployed Worker URL, then rebuild GitHub Pages.
The API only permits browser requests from the GitHub Pages origin.

Run `node --test classroom-worker/src.test.js src/flow.test.js` from the repository
root. The free Cloudflare plan has usage limits, so deployment and real classroom
operation still need an end-to-end check.
