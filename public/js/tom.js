/*global $, fetch, console*/

const endpoint = "https://cloudflare-ipfs.com/ipfs/";
const cleanUrl = (url) => {
  if (url.startsWith("ipfs://")) {
    return url
      .replace("ipfs://", endpoint)
      .replace("https://ipfs.io/ipfs/", endpoint);
  } else {
    return url;
  }
};

$("[data-meta]").each(function () {
  const $this = $(this);
  fetch($this.data("meta"))
    .then((response) => response.json())
    .then((json) => {
      if (json && json.image) {
        // console.log(json);
        $this.attr("src", cleanUrl(json.image)).attr("alt", json.name);
        const $card = $this.closest(".product-style-one");
        $card
          .find("[data-name]")
          .text(json.name)
          .parent("a")
          .attr("href", $this.data("meta"));
        $card.find("[data-description]").text(json.description);
        $card
          .find(".spotlight")
          .attr("href", cleanUrl(json.image))
          .attr("data-description", json.description);
        $card.find("[data-feather]").remove();
        $card.find(".feather-loader").remove();
      }
    })
    .catch(console.log.bind(console, "FETCH"));
});
