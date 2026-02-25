const axios = require('axios');

module.exports = (baseURL) => ({
    /**
     * Fetch champion metadata for the configured Data Dragon version/locale.
     * @returns {Promise<object>} Champion data.
     */
    async getChampions() {
        try {
            const response = await axios.get(`${baseURL}/champion.json`);
            return response.data;
        } catch (error) {
            throw new Error(`DataDragon error: ${error.message}`);
        }
    },

    /**
     * Fetch item metadata for the configured Data Dragon version/locale.
     * @returns {Promise<object>} Item data.
     */
    async getItems() {
        try {
            const response = await axios.get(`${baseURL}/item.json`);
            return response.data;
        } catch (error) {
            throw new Error(`DataDragon error: ${error.message}`);
        }
    },
});
