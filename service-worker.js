const CACHE_NAME = "if-sync-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Instala a nova versão
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Ativa a nova versão e remove caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Busca arquivos
self.addEventListener("fetch", event => {

  // Para páginas HTML:
  // tenta primeiro pegar a versão mais recente da internet.
  if (event.request.mode === "navigate") {

    event.respondWith(
      fetch(event.request)
        .then(response => {

          const copia = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put("./index.html", copia);
            });

          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  // Para os outros arquivos:
  // usa o cache primeiro e, se não existir, busca na internet.
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
// Recebe notificações push
self.addEventListener("push", event => {
  let dados = {
    title: "IF Sync",
    body: "Você tem uma nova notificação.",
    url: "./"
  };

  if (event.data) {
    try {
      dados = { ...dados, ...event.data.json() };
    } catch (erro) {
      dados.body = event.data.text();
    }
  }

  const opcoes = {
    body: dados.body,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: {
      url: dados.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      dados.title || "IF Sync",
      opcoes
    )
  );
});

// Abre o IF Sync quando a notificação é tocada
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const destino = new URL(
    event.notification.data?.url || "./",
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(janelas => {
      for (const janela of janelas) {
        if (janela.url.startsWith(self.location.origin)) {
          return janela.focus();
        }
      }

      return clients.openWindow(destino);
    })
  );
});
