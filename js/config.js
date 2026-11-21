/* Configurações públicas do site.
   WEB3FORMS_KEY: crie uma chave gratuita em https://web3forms.com usando o e-mail
   que deve receber as mensagens. A chave é pública por design (pode ficar no front-end).
   Enquanto estiver vazia, os formulários abrem o WhatsApp com a mensagem preenchida. */
export const CONFIG = {
  WEB3FORMS_KEY: '',
  WHATSAPP: '5579991489065',
  EMAIL: 'institucional@quarksclub.org',
  // Anexos do Contato. Envio de arquivos no Web3Forms exige o plano Pro;
  // sem chave, os anexos não seguem pelo WhatsApp e o site pede um link compartilhado.
  FILES: { max: 3, maxSize: 5 * 1024 * 1024, maxTotal: 10 * 1024 * 1024 },
};
