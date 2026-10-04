const CANONICAL = "www.welcometolayer2.com";

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== CANONICAL && !url.hostname.endsWith(".workers.dev")) {
      url.hostname = CANONICAL;
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
