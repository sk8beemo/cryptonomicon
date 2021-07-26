<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            @keyup="tickerKeyHandler"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <div
          class="flex bg-white shadow-md p-1 rounded-md flex-wrap"
          v-if="tokenList.length !== 0"
        >
          <span
            v-for="c in tokenList"
            :key="c"
            @click="add(c)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ c }}
          </span>
        </div>
        <div v-if="isUsage" class="text-sm text-red-600">
          Такой тикер уже добавлен
        </div>
        <add-button @click="add()" />
      </div>
    </div>
  </section>
</template>
<script>
import AddButton from "./AddButton.vue";

export default {
  components: {
    AddButton
  },

  props: {
    tokenList: Array,
    isUsage: Boolean
  },

  data() {
    return {
      ticker: ""
    };
  },

  methods: {
    add(token = null) {
      if (token) {
        this.ticker = token;
      }
      this.$emit("add-ticker", this.ticker);
      this.ticker = "";
    },

    tickerKeyHandler(event) {
      if (event.key === "Enter") {
        this.add();
      } else {
        this.$emit("find-tokens", this.ticker);
      }
    }
  }
};
</script>
