const judgeStatus = (status: number) => {
  if (status === 401) {
    console.log('Unauthorized token');
    // sessionStorage.removeItem('temp_token');
    // Cookies.set('error_message', '無効なトークンです。もう一度ログインしてください。', { secure: true })
    // sessionStorage.setItem('error_message', '無効なトークンです。はじめからやりなおしてください。');
    // window.location.href = '/';
    return false;
  } else if (status === 500) {
    console.log('Internal server error');
    // sessionStorage.removeItem('temp_token');
    // Cookies.set('error_message', 'サーバーエラーです。はじめからやりなおしてください。', { secure: true })
    // sessionStorage.setItem('error_message', 'サーバーエラーです。はじめからやりなおしてください。');
    // window.location.href = '/';
    return false;
  } else {
    return true;
  }
}

// const fetch_callFFmpeg = async (filename: string) => {
//   const res = await fetch("../../api/callFFmpeg", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({ filename: filename })
//   });
//   return res;
// }

const fetch_updateDatabase = async () => {
  const res = await fetch("../../api/updateDatabase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
  return res;
}

export { judgeStatus, fetch_updateDatabase };