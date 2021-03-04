'use strict';

/**
 * @ngdoc function
 * @name yapp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of yapp
 */
angular.module('yapp')
  .controller('DashboardCtrl', function($scope, $timeout, $state, AuthService, $location, Session) {
    
  	if(!AuthService.isAuthenticated())
  		$location.path('/');

    $scope.$state = $state;

    $scope.user = Session.user;
    $scope.userObj = {};
    $scope.overview = {savings: 0, balance: 0, interest: 0};
    $scope.eligilityAmount = 0;

    $scope.report = {};
    
    $scope.saveData = function(tr, k) {
      firebase.database().ref('transaction/'+k+'/user/').set(tr.user);
      firebase.database().ref('transaction/'+k+'/notes/').set(tr.notes);
      firebase.database().ref('transaction/'+k+'/ts/').set(new Date(tr.dt).getTime());
    }

    $scope.reportDetails = function(id){
      if(id === undefined){
        $scope.report.user = angular.copy($scope.user.id);
      }

      $scope.report.transactions = [];
      firebase.database().ref('transaction').orderByChild('user').equalTo($scope.report.user).on('value', function(snap) {
        $scope.report.transactions = snap.val();
        $scope.$apply();
      });
    };
    
    $scope.currentTime = new Date().getTime();
    $scope.expense = {amount: 500};

    var query = firebase.database().ref('summary');
    query.on('value', function(snap) {
        if (snap.val()) {
          $scope.overview = snap.val();
        }
        
        $scope.eligilityAmount = parseInt(($scope.overview.savings / 4)/1000)*1000;
        
        if($scope.eligilityAmount > $scope.overview.balance){
          $scope.eligilityAmount = parseInt($scope.overview.balance/1000)*1000;
        }
        $scope.loanrequest = {amount: angular.copy($scope.eligilityAmount)};
        $scope.$apply();
    });
    
    $scope.loanrequest = {};
    
    $scope.users = [];
    
    var query = firebase.database().ref('users');
    query.once('value', function(snap) {
        if(snap.numChildren()){
          var res = snap.val();
          angular.forEach(res, function(v,k){
            v.id = k;
          	$scope.users.push(v);
          	$scope.userObj[k] = v;
          });
        }
        $scope.$apply();
    });

    $scope.menuItems = [];
    angular.forEach($state.get(), function (item) {
        if (item.data && item.data.visible) {
            $scope.menuItems.push({name: item.name, text: item.data.text});
        }
    });

    $scope.logout = function(){
    	Session.destroy();
    	$location.path('/');
    };
    
    $scope.transactions = {};
    
    firebase.database().ref('transaction').limitToLast(50).on('value', function(snap) {
        $scope.transactions = snap.val();
        $scope.$apply();
    });
    
    $scope.pendingtransactions = {};
    $scope.havePendingTransactions = 0;
    
    $scope.loanRequests = {};
    $scope.activeloans = {};
    $scope.closed_loans = {};
    $scope.haveloanRequests = 0;
    
    $scope.pageInfo = {user_id: 0};
    
    $scope.paysavings = function() {
        $scope.expense.ts = new Date().getTime();
        $scope.expense.type = 'credit';
        $scope.expense.action = 'savings';
        $scope.expense.paid_by = angular.copy($scope.user.id);
        if($scope.user.isAdmin){
          
          $scope.overview.balance = parseInt($scope.expense.amount) + parseInt($scope.overview.balance);
          $scope.overview.savings = parseInt($scope.expense.amount) + parseInt($scope.overview.savings);
          
          firebase.database().ref('summary/').set($scope.overview);

          $scope.expense.balance = $scope.overview.balance;
          firebase.database().ref('transaction').push($scope.expense);
          $.notify("Payment Submitted", "success");
        } else {
          $scope.expense.user = angular.copy($scope.user.id);
          $scope.expense.balance = $scope.overview.balance;
          firebase.database().ref('pendingtransaction').push($scope.expense); 
          $.notify("Payment Submitted, waiting for approval", "info");
        }
        
        $scope.expense = {amount: 500};
        
        $state.go('statement');
        
        return false;
    }

    $scope.addExpense = function() {
      $scope.expense.ts = new Date().getTime();
      $scope.expense.type = 'debit';
      $scope.expense.action = 'expense';
      $scope.expense.paid_by = angular.copy($scope.user.id);
      if($scope.user.isAdmin){
        
        $scope.overview.balance = parseInt($scope.overview.balance) - parseInt($scope.expense.amount);
        $scope.overview.interest = parseInt($scope.expense.amount) + parseInt($scope.overview.interest);
        
        firebase.database().ref('summary/').set($scope.overview);
        
        $scope.expense.balance = $scope.overview.balance;
        firebase.database().ref('transaction').push($scope.expense);
        $.notify("Payment Submitted", "success");
      } else {
        $scope.expense.user = angular.copy($scope.user.id);
        $scope.expense.balance = $scope.overview.balance;
        firebase.database().ref('pendingtransaction').push($scope.expense); 
        $.notify("Payment Submitted, waiting for approval", "info");
      }
      
      $scope.expense = {amount: 500};
      
      $state.go('statement');
      
      return false;
  }
    
    $scope.loanrequestExist = false;
    $scope.loanExist = false;
    
    $scope.myloan = {};
    
    $scope.missed_payment = false;
    

  });
