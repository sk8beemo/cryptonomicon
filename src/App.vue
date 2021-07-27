<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <app-spinner v-if="loading" />
    <div class="container">
      <section>
        <add-ticker
          :tokenList="tokenList"
          :isUsage="isUsage"
          @add-ticker="add"
          @find-tokens="tokenListHandler"
        />
      </section>

      <template v-if="tickers.length">
        <hr />
        <div>
          <navigate-button
            :buttonText="'Назад'"
            @handlePage="page = page - 1"
            v-if="page > 1"
          />
          <navigate-button
            :buttonText="'Вперед'"
            @handlePage="page = page + 1"
            v-if="hasNextPage"
          />
          <div>Фильтр: <input v-model="filter" /></div>
        </div>
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <app-ticker
            v-for="t in paginatedTickers"
            :key="t.name"
            :ticker="t"
            :selectedTicker="selectedTicker"
            @selectTicker="select(t)"
            @deleteTicker="handleDelete(t)"
          />
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <app-graph
        v-if="selectedTicker"
        :selectedTicker="selectedTicker"
        :graph="graph"
        @sliceGraph="removeLegacyGraph(graphNumber)"
        @close="selectedTicker = null"
      />
    </div>
  </div>
</template>

<script>
// [x] 6. Наличие в состоянии ЗАВИСИМЫХ ДАННЫХ | Критичность: 5+
// [ ] 4. Запросы напрямую внутри компонента (???) | Критичность: 5
// [ ] 2. При удалении остается подписка на загрузку тикера | Критичность: 5
// [ ] 5. Обработка ошибок API | Критичность: 5
// [x] 3. Количество запросов | Критичность: 4
// [x] 8. При удалении тикера не изменяется localStorage | Критичность: 4
// [x] 1. Одинаковый код в watch | Критичность: 3
// [ ] 9. localStorage и анонимные вкладки | Критичность: 3
// [x] 7. График ужасно выглядит если будет много цен | Критичность: 2
// [ ] 10. Магические строки и числа (URL, 5000 миллисекунд задержки, ключ локал стораджа, количество на странице) |  Критичность: 1

// Параллельно
// [x] График сломан если везде одинаковые значения
// [x] При удалении тикера остается выбор

import { subscribeToTicker, unsubscribeFromTicker } from "./api";
import AddTicker from "./components/AddTicker.vue";
import AppSpinner from "./components/AppSpinner.vue";
import NavigateButton from "./components/NavigateButton.vue";
import AppTicker from "./components/AppTicker.vue";
import AppGraph from "./components/AppGraph.vue";

let coins;
export default {
  name: "App",

  components: {
    AddTicker,
    AppSpinner,
    NavigateButton,
    AppTicker,
    AppGraph
  },

  data() {
    return {
      loading: false,
      isUsage: false,

      filter: "",
      tickers: [],
      selectedTicker: null,
      tokenList: [],
      graph: [],
      page: 1
    };
  },

  created: function() {
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );

    const VALID_KEYS = ["filter", "page"];

    VALID_KEYS.forEach(key => {
      if (windowData[key]) {
        this[key] = windowData[key];
      }
    });

    // if (windowData.filter) {
    //   this.filter = windowData.filter;
    // }

    // if (windowData.page) {
    //   this.page = windowData.page;
    // }

    const tickersData = localStorage.getItem("cryptonomicon-list");

    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach(t => {
        subscribeToTicker(t.name, price => this.updateTicker(t.name, price));
      });
    }
  },

  mounted: async function() {
    this.loading = true;
    await fetch(
      "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
    )
      .then(response => response.json())
      .then(
        data =>
          (coins = Object.values(data.Data).map(function(a) {
            a.FullName = a.FullName.toLowerCase();
            return a;
          }))
      );
    this.loading = false;
  },

  computed: {
    startIndex() {
      return (this.page - 1) * 6;
    },

    endIndex() {
      return this.page * 6;
    },

    filteredTickers() {
      return this.tickers.filter(ticker => ticker.name.includes(this.filter));
    },

    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },

    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },

    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page
      };
    }
  },

  methods: {
    updateTicker(tickerName, price) {
      this.tickers
        .filter(t => t.name === tickerName)
        .forEach(t => {
          if (t === this.selectedTicker) {
            this.graph.push(price);
          }
          t.price = price;
        });
    },

    add(name) {
      const currentTicker = {
        name: name,
        price: "-"
      };
      this.tokenList = [];

      if (this.checkUsage(currentTicker)) {
        return;
      }

      this.tickers = [...this.tickers, currentTicker];

      subscribeToTicker(currentTicker.name, price =>
        this.updateTicker(currentTicker.name, price)
      );
      this.filter = "";
    },

    checkUsage(ticker) {
      const existTicker = this.tickers.find(
        item => item.name.toLowerCase() === ticker.name.toLowerCase()
      );

      if (existTicker) {
        this.isUsage = true;
        return true;
      } else {
        this.isUsage = false;
        return false;
      }
    },

    tokenListHandler(value) {
      if (!value) {
        this.tokenList = [];
        return;
      }

      this.tokenList = coins
        .filter(item => item["FullName"].indexOf(value.toLowerCase()) !== -1)
        .map(item => item["Symbol"])
        .splice(0, 4);
    },

    select(ticker) {
      this.selectedTicker = ticker;
    },

    handleDelete(tickerToRemove) {
      this.tickers = this.tickers.filter(t => t !== tickerToRemove);
      if (this.selectedTicker === tickerToRemove) {
        this.selectedTicker = null;
      }
      unsubscribeFromTicker(tickerToRemove.name);
    },

    removeLegacyGraph(number) {
      this.graph = this.graph.slice(0, number);
    }
  },

  watch: {
    selectedTicker() {
      this.graph = [];
    },

    tickers(newValue, oldValue) {
      // Почему не сработал watch при добавлении?
      console.log(newValue === oldValue);
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },

    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },

    filter() {
      this.page = 1;
    },

    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    }
  }
};
</script>
