// // ・日付を使って毎週何曜日の何時に放送か？
// // ・放送局は？

// const extractWeekdayAndTime = (str: string): string => {
// 	// [20240429月2154] => 「毎週月曜日 21:54」
// 	let message = "";
// 	const weekdayAndTime = str.match(/\[(.*?)\]/);
// 	if (weekdayAndTime) {
// 		const weekday: string = weekdayAndTime[1].slice(8, 9);
// 		const time = weekdayAndTime[1].slice(8, 12);
// 		message = `毎週${weekday}曜日 ${time.slice(0, 2)}:${time.slice(2, 4)}`;
// 	} else {
// 		message = "放送日時が取得できませんでした";
// 	}
// 	return message;
// };

// const extractServiceName = (str: string): string => {
// 	// []側から数えて一番近くにある()の中身を取得
// 	let message = "";
// 	const serviceName = str.match(/\((.*?)\)/);
// 	if (serviceName) {
// 		message = serviceName[1];
// 	} else {
// 		message = "放送局が取得できませんでした";
// 	}
// 	return message;
// };
