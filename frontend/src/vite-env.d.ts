/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Zona horaria IANA de la barbería. Debe coincidir con SHOP_TIMEZONE del backend. */
  readonly VITE_SHOP_TIMEZONE?: string;
}
