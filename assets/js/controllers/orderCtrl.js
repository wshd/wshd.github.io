app.controller('ListOrderCtrl', [ '$scope', '$filter', '$modal', 'Storage', 'Notify', '$localForage',
    function ($scope, $filter, $modal, Storage, Notify, $localForage) {
        var INSTANCE = 'order';

        var orderLoading = true,
            regionLoading = true,
            clientLoading = true;
            lastTableState = {};
        $scope.isLoading = true;
        $scope.$on('regionchange', function(){
            FilterOrders();
        });

        var applyOrders = function (data) {
            angular.forEach(data, function (v, k) {
                v._bags = angular.fromJson(v.bags);
                v._goods = angular.fromJson(v.goods);
                v.number_int = parseInt(v.number);
                v.weight_int = parseInt(v.weight);
                v.bags_amount = v._bags.length;
            });
            $scope.orders = data;
            FilterOrders();
        };

        var applyRegionsByDate = function (data) {
            $scope.app.regions = data;
            drawChart();
        };

        var applyRegions = function (data) {
            $scope.regions = data;
        };

        var applyClients = function (data) {
            $scope.clients = data;
        };

        var reloadOrders = function () {
            if ($scope.isOnline()) {
                var params = {
                    "sel_date": $scope.app.selDate
                };

                Storage.getSP_params('orders_by_date', params).then(function (data) {
                        applyOrders(data);
                        orderLoading = false;
                        calcLoading();
                    },
                    function (msg) {
                        console.log('Orders loading failed. ' + msg);
                        showError('list', null);
                        orderLoading = false;
                        calcLoading();
                    });
            } else {
                orderLoading = false;
                calcLoading();
            }
        };

        var reloadRegions = function () {
            if ($scope.isOnline()) {
                Storage.get('region').then(function (data) {
                    applyRegions(data);
                }, function (msg) {
                    console.log('Regions loading failed. ' + msg);
                });
            }
        };

        var reloadRegionsByDate = function () {
            if ($scope.isOnline()) {
                var params = {
                    "sel_date": $scope.app.selDate
                };

                Storage.getSP_params('region_orders_by_date', params).then(function (data) {
                        applyRegionsByDate(data);
                        regionLoading = false;
                        calcLoading();
                    },
                    function (msg) {
                        console.log('Orders loading failed. ' + msg);
                        showError('list', null);
                        regionLoading = false;
                        calcLoading();
                    });
            } else {
                regionLoading = false;
                calcLoading();
            }
        };

        var reloadClients = function () {
            if ($scope.isOnline()) {
                Storage.getSP('clients_with_totals').then(function (data) {
                    applyClients(data);
                    clientLoading = false;
                    calcLoading();
                }, function (msg) {
                    console.log('Clients loading failed. ' + msg);
                    clientLoading = false;
                    calcLoading();
                });
            } else {
                clientLoading = false;
                calcLoading();
            }
        };


        var reloadCachedOrders = function () {
            $localForage.getItem('orders_by_date?' + $scope.app.selDate).then(function (data) {
                applyOrders(data);
                if (data != null) {
                    orderLoading = false;
                    calcLoading();
                }
                reloadOrders();
            }).catch(function () { reloadOrders(); });
        };

        var reloadCachedRegions = function () {
            $localForage.getItem('region?transform=1').then(function (data) {
                applyRegions(data);
                reloadRegions();
            }).catch(function () { reloadRegions(); });
        };

        var reloadCachedRegionsByDate = function () {
            $localForage.getItem('region_orders_by_date?' + $scope.app.selDate).then(function (data) {
                applyRegionsByDate(data);
                if (data != null) {
                    regionLoading = false;
                    calcLoading();
                }
                reloadRegionsByDate();
            }).catch(function () { reloadRegionsByDate(); });
        };

        var reloadCachedClients = function () {
            $localForage.getItem('clients_with_totals').then(function (data) {
                applyClients(data);
                if (data != null) {
                    clientLoading = false;
                    calcLoading();
                }
                reloadClients();
            }).catch(function () { reloadClients(); });
        };

        var reload = function () {
            reloadOrders();
            reloadRegionsByDate();
            reloadRegions();
            reloadClients();
        };


        var reloadFromCache = function () {
            reloadCachedOrders();
            reloadCachedRegionsByDate();
            reloadCachedRegions();
            reloadCachedClients();
        };
        reloadFromCache();

        var calcLoading = function () {
            $scope.isLoading = orderLoading || regionLoading || clientLoading;
        };

        var FilterOrders = function () {
            $scope.filteredOrders = ($scope.app.selRegion || {}).id > 0
                ? $scope.orders.filter(function(o){return o.region_id == $scope.app.selRegion.id})
                : $scope.orders;
            $scope.regionName = ($scope.app.selRegion || {}).name || "Всі";
            $scope.regionOrders = ($scope.app.selRegion || {}).order_amount || CountTotalOrders();
            $scope.regionWeight = ($scope.app.selRegion || {}).order_total_weight || CountTotalWeight();
            $scope.sorted(lastTableState);
        };

        var CountTotalOrders = function () {
            var i = 0, regs = $scope.app.regions || [], max = regs.length, total = 0;
            for (i; i<max; i++){ total += parseInt(regs[i].order_amount) || 0; }
            return total;
        }

        var CountTotalWeight = function () {
            var i = 0, regs = $scope.app.regions || [], max = regs.length, total = 0;
            for (i; i<max; i++){ total += parseInt(regs[i].order_total_weight) || 0; }
            return total;
        }

        var drawChart = function () {
            var rows = [];
            $scope.chart = {};

            $scope.chart.type = "BarChart";

            angular.forEach($scope.app.regions, function (v) {
                var row = {c: []};
                row.c.push({v: v.name});
                row.c.push({v: v.order_amount});
                row.c.push({v: v.order_total_weight});
                rows.push(row);
            });

            $scope.chart.data = {"cols": [
                {id: "r", label: "Region", type: "string"},
                {id: "a", label: "Кількість", type: "number"},
                {id: "w", label: "Вага (кг)", type: "number"}
            ], "rows": rows
            };

            $scope.chart.options = {
                'colors': ['#f05050', '#16aad8'],
                'isStacked': 'true',
                'chartArea': {'left': '150', 'right': '15', 'top': '10', 'width': '100%', 'height': '80%'},
                'legend': {'position': 'bottom'}
            };
        };

        $scope.sorted = function (tableState) {
            if ($scope.filteredOrders) {
                var predicate = tableState.sort.predicate || "number_int";
                var start = tableState.pagination.start || 0;
                var number = $scope.app.settings.itemsPerPage;
                var reverse = tableState.sort.reverse;
                $scope.filteredOrders = $filter('orderBy')($scope.filteredOrders, predicate, reverse);
                tableState.pagination.numberOfPages = Math.ceil($scope.filteredOrders.length / number);
                $scope.displayOrders = $scope.filteredOrders.slice(start, start + number);
            }
            lastTableState = tableState;
        };

        var showError = function (action, name) {
            var messages = {
                list: "Помилка при завантаженні замовлень!",
                add: "Помилка при додаванні!",
                edit: "Помилка при збереженні!",
                delete: "Помилка при видаленні!"
            };
            Notify.error(INSTANCE, action, name, messages[action])
        };

        var showSuccess = function (action, name) {
            var messages = {
                add: "Замовлення було успішно додано!",
                edit: "Замовлення було успішно збережено!",
                delete: "Замовлення було успішно видалено!"
            };
            Notify.success(INSTANCE, action, name, messages[action])
        };


        $scope.open_calendar = function($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.calendar_opened = true;
        };

        $scope.client_selected = function(client) {
            $scope.orderToEdit.client_id = client.id;
            $scope.orderToEdit.address = client.address;
            $scope.orderToEdit.region_id = parseInt(client.region_id);
        };

        $scope.getTotalWeight = function(){
            return $scope.orderToEdit._bags.reduce(function(pv, cv) { return parseInt(pv) + parseInt(cv); }, 0);
        };

        $scope.isUnchanged = function () {
            return angular.equals($scope.prevOrder, $scope.orderToEdit)
        };

        $scope.editClient = function () {
            console.log($scope.orderToEdit.selected_client.id);

            var ACTION = 'edit';
            var _ENTITY = 'client';
            $scope.clientToEdit = $scope.orderToEdit.selected_client;
            $scope.clientToEdit.isNew = false;
            $scope.clientToEdit.region_id = parseInt($scope.orderToEdit.selected_client.region_id);
            var modalInstance = $modal.open({
                templateUrl: 'assets/tpl/client/edit.html',
                backdrop: 'static',
                scope: $scope
            });

            modalInstance.result.then(function (item) {
                Storage.update(_ENTITY, item).then(
                    function (data) {
                        reload();
                        Notify.success(_ENTITY, ACTION, item.name, 'Клієнта було успішно збережено!');
                        $scope.orderToEdit.selected_client = angular.copy(item);
                        $scope.client_selected(item);
                    }, function (msg) {
                        Notify.error(_ENTITY, ACTION, item.name, 'Помилка при збереженні!');
                        console.log('Client ' + ACTION + ' failed. ' + msg);
                    }
                );
            });

        };

        $scope.addClient = function () {
            var ACTION = 'add';
            var _ENTITY = 'client';
            $scope.clientToEdit = {
                isNew: true,
                region_id: $scope.orderToEdit.region_id
            };
            var modalInstance = $modal.open({
                templateUrl: 'assets/tpl/client/edit.html',
                backdrop: 'static',
                scope: $scope
            });

            modalInstance.result.then(function (item) {
                Storage.insert(_ENTITY, item).then(
                    function (data) {
                        reload();
                        Notify.success(_ENTITY, ACTION, item.name, 'Клієнта було успішно додано!');
                        item.id = data;
                        $scope.orderToEdit.selected_client = item;
                        $scope.client_selected(item);
                    }, function (msg) {
                        Notify.error(_ENTITY, ACTION, item.name, 'Помилка при додаванні!');
                        console.log('Client ' + ACTION + ' failed. ' + msg);
                    }
                );
            });
        };

        $scope.add = function () {
            var ACTION = 'add';
            $scope.orderToEdit = {
                isNew: true,
                region_id: parseInt(($scope.app.selRegion || {}).id) || 0,
                client_id: 0,
                date: $scope.app.selDate,
                _bags: [],
                _goods: []
            };
            $scope.prevOrder = {};
            var modalInstance = $modal.open({
                templateUrl: 'assets/tpl/order/edit.html',
                scope: $scope,
                size: 'lg'
            });

            modalInstance.result.then(function (item) {
                item.bags = JSON.stringify(item._bags);
                item.goods = JSON.stringify(item._goods);
                item.date = $filter('date')(item.date, 'yyyy-MM-dd');
                item.weight = $scope.getTotalWeight();
                Storage.insert(INSTANCE, item).then(
                    function (data) {
                        showSuccess(ACTION, item.number);
                        reload();
                    }, function (msg) {
                        showError(ACTION, item.number);
                        console.log('Order ' + ACTION + ' failed. ' + msg);
                    }
                );
            });
        };

        $scope.edit = function (order) {
            var ACTION = 'edit';
            $scope.orderToEdit = angular.copy(order);
            $scope.orderToEdit.region_id = parseInt($scope.orderToEdit.region_id);
            $scope.orderToEdit.client_id = parseInt($scope.orderToEdit.client_id);
            $scope.orderToEdit.selected_client = $scope.clients.filter(function(c){return c.id == $scope.orderToEdit.client_id;})[0];
            $scope.orderToEdit.isNew = false;
            $scope.prevOrder = angular.copy($scope.orderToEdit);
            var modalInstance = $modal.open({
                templateUrl: 'assets/tpl/order/edit.html',
                scope: $scope,
                size: 'lg'
            });

            modalInstance.result.then(function (item) {
                item.bags = JSON.stringify(item._bags);
                item.goods = JSON.stringify(item._goods);
                item.date = $filter('date')(item.date, 'yyyy-MM-dd');
                item.weight = $scope.getTotalWeight();
                Storage.update(INSTANCE, item).then(
                    function (data) {
                        showSuccess(ACTION, item.number);
                        reload();
                    }, function (msg) {
                        showError(ACTION, item.number);
                        console.log('Order ' + ACTION + ' failed. ' + msg);
                    }
                );
            });
        };

        $scope.delete = function (client) {
            var ACTION = 'delete';
            $scope.orderToDelete = client;
            var modalInstance = $modal.open({
                templateUrl: 'assets/tpl/order/delete.confirm.html',
                scope: $scope
            });

            modalInstance.result.then(function (item) {
                Storage.delete(INSTANCE, item.id).then(
                    function (data) {
                        reload();
                        showSuccess(ACTION, item.number);
                    }, function (msg) {
                        console.log('Order ' + ACTION + ' failed. ' + msg);
                        showError(ACTION, item.number);
                    }
                );
            });
        };

    }]);

app.controller('HistoryOrderCtrl', [ '$scope', '$state', '$filter', 'Storage', 'Notify', '$localForage',
    function ($scope, $state, $filter, Storage, Notify, $localForage) {
        var today = {
            date: $filter('date')(new Date(), 'yyyy-MM-dd'),
            isToday: true,
            amount: "0",
            total_weight: "0"
        };

        $scope.isLoading = true;

        var applyData = function (data) {
            drawChart(data);
            if (data && data.length && data[0].date == today.date){
                data[0].isToday = true;
            } else {
                data = [today].concat(data);
            }
            $scope.dates = data;
        };

        var reload = function () {
            if ($scope.isOnline()) {
                Storage.getSP('order_history').then(function (data) {
                    applyData(data);
                    $scope.isLoading = false;
                }, function (msg) {
                    console.log('Order history loading failed. ' + msg);
                    Notify.error('order', 'list', null, 'Помилка при завантаженні історії замовлень!');
                    $scope.isLoading = false;
                });
            } else {
                $scope.isLoading = false;
            }
        };

        var reloadFromCache = function () {
            $localForage.getItem('order_history').then(function (data) {
                applyData(data);
                if (data != null) {
                    $scope.isLoading = false;
                }
                reload();
            }).catch(function () {
                reload();
            });
        };

        reloadFromCache();

        var drawChart = function (data) {
            var rows = [];
            $scope.chart = {};

            $scope.chart.type = "LineChart";

            angular.forEach(data, function (v) {
                var row = {c: []};
                row.c.push({v: new Date(v.date)});
                row.c.push({v: v.amount});
                row.c.push({v: v.total_weight});
                rows.push(row);
            });

            $scope.chart.data = {"cols": [
                {id: "d", label: "Дата", type: "date"},
                {id: "a", label: "Кількість", type: "number"},
                {id: "w", label: "Вага (кг)", type: "number"}
            ], "rows": rows
            };

            $scope.chart.options = {
                'colors': ['#f05050', '#16aad8'],
                'isStacked': 'true',
                'chartArea': {'left': '70', 'right': '15', 'top': '10', 'width': '100%', 'height': '80%'},
                'legend': {'position': 'bottom'},
                "fill": 20,
                "displayExactValues": true
            };
        };

        $scope.selectDate = function (newDate) {
            $scope.app.selDate = newDate;
            $scope.app.selRegion = {};
            $state.go('app.orders');
        };
    }]);
