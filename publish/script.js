var storedData = [];

function initCookie() {
  chrome.tabs.query(
    {
      status: 'complete',
      windowId: chrome.windows.WINDOW_ID_CURRENT,
      active: true,
    },
    function (tab) {
      chrome.cookies.getAll({ name: 'UserID' }, function (cookie) {
        sessionStorage.setItem('MSV', cookie[0].value);
        update();
      });
    }
  );
}
window.onload = () => {
  initCookie();

  var node = document.getElementById('startButton');
  node.addEventListener('click', function () {
    document
      .getElementById('inputID')
      .value.split('\n')
      .forEach((data) => addStoreData(data));
    document.getElementById('inputID').value = '';
    document.getElementById('inputID').readOnly = true;
    node.disabled = true;
    update();
  });

  document.getElementById('stopButton').addEventListener('click', () => {
    clearStoreData();
    update();

    document.getElementById('inputID').readOnly = false;
    document.getElementById('startButton').disabled = false;
  });
};

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function initUI() {
  document.getElementById('url-not-valid').style.display = 'none';
  document.getElementById('root').style.display = 'block';

  document.getElementById('msv').textContent =
    'Xin chào ' + sessionStorage.getItem('MSV') + ',';

  initDataTable();
}

function initDataTable() {
  var table = document.getElementById('dataTable');

  if (storedData.length == 0) {
    table.innerHTML =
      '<tr style="font-size: 12pt;"><th>Lớp học phần</th><th>Trạng thái</th><th>Hành động</th></tr>';
    return;
  }

  storedData.forEach((data) => {
    var html =
      '<tr><td>' +
      data +
      "</td><td id='" +
      data +
      "_status'>Đang tải</td><td><button class='removeButton' id='" +
      data +
      "_removeBtn'>Xóa bỏ</button></td></tr>";
    table.innerHTML = table.innerHTML + html;

    document
      .getElementById(data + '_removeBtn')
      .addEventListener('click', () => {
        removeStoreData(data);
        update();
      });
  });
}

function loadStoredData() {
  storedData = JSON.parse(localStorage.getItem('subject-stored-data'));
  if (storedData == null || storedData == undefined) {
    storedData = [];
  }
}

function addStoreData(data) {
  storedData.push(data);
  localStorage.setItem('subject-stored-data', JSON.stringify(storedData));
}

function clearStoreData() {
  if (storedData.length > 0) storedData.length = 0;
  localStorage.removeItem('subject-stored-data');
}

function removeStoreData(data) {
  storedData = storedData.filter(function (item) {
    return item !== data;
  });
  localStorage.setItem('subject-stored-data', JSON.stringify(storedData));
}

function update() {
  getCurrentTab().then((tab) => {
    if (tab.url && tab.url.includes('tinchi.neu.edu.vn')) {
      loadStoredData();
      initUI();
    }

    fetch('https://tinchi.neu.edu.vn/DangKyHocPhan/KetQuaDangKy/1').then(
      (response) => {
        response
          .text()
          .then(
            (_) => (document.getElementById('registeredSubjects').innerHTML = _)
          );
      }
    );
  });

  doWork();
}

var intervalID = 0;
function doWork() {
  clearInterval(intervalID);

  intervalID = setInterval(() => {
    storedData.forEach((data) => {
      var request =
        'https://tinchi.neu.edu.vn/DangKyHocPhan/DangKy?Hide=' +
        data +
        '$0.0$' +
        data.split('_')[0] +
        '$$0&acceptConflict=true&classStudyUnitConflictId=&RegistType=KH';
      console.log(request);

      timeoutFetch(
        3000,
        fetch(request)
          .then((response) => response.text())
          .then((jsonText) => {
            console.log(jsonText);
            var json = JSON.parse(jsonText);

            var message = json.Msg;
            if (message.includes('đã đủ số lượng')) {
              document.getElementById(data + '_status').innerHTML =
                'Hết slot. Đang chờ để nhảy vào ...';
              document.getElementById(data + '_status').style.color = 'gray';
            } else if (message.includes('Trùng lịch')) {
              document.getElementById(data + '_status').innerHTML =
                'Trùng lịch';
              document.getElementById(data + '_status').style.color =
                'goldenrod';
            } else if (message.includes('25 tín')) {
              document.getElementById(data + '_status').innerHTML =
                'Đã đủ 25 tín';
              document.getElementById(data + '_status').style.color =
                'darkblue';
            } else {
              document.getElementById(data + '_status').innerHTML =
                'Thành công';
              document.getElementById(data + '_status').style.color = 'green';
              removeStoreData(data);
            }
          })
      );
    });
  }, 1000);
}

function timeoutFetch(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}
