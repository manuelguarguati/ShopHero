function createCartClient({ baseUrl = process.env.CARRITO_URL || 'http://localhost:3001', fetchImpl = fetch } = {}) {
  return {
    async getCart(usuarioId, authHeader) {
      const response = await fetchImpl(`${baseUrl}/api/carritos/${encodeURIComponent(usuarioId)}`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const error = new Error(payload?.error || 'Error consultando el carrito');
        error.statusCode = response.status >= 500 ? 503 : response.status;
        throw error;
      }
      return response.json();
    },

    async clearCart(usuarioId, authHeader) {
      const response = await fetchImpl(`${baseUrl}/api/carritos/${encodeURIComponent(usuarioId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok && response.status !== 204) {
        const error = new Error('No se pudo vaciar el carrito tras confirmar el pedido');
        error.statusCode = response.status;
        throw error;
      }
      return true;
    },
  };
}

module.exports = { createCartClient };
