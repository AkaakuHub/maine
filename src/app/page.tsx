"use client";

import React, { useState, useEffect } from "react";
import style from "./page.module.css";

// import oldDatabaseJson from "../../public/Files/database.json";

import { fetch_updateDatabase, judgeStatus } from "@/libs/APIhandler";
import { DatabaseJsonType } from "@/type";

import MakeDatabaseCard from "@/components/(parts)/MakeDatabaseCard";

const Home = () => {
	const [database, setDatabase] = useState<DatabaseJsonType | null>(null);

	useEffect(() => {
		const updateDatabase = async () => {
			const res = await fetch_updateDatabase();
			if (judgeStatus(res.status)) {
				const data = await res.json();
				console.log("updateDatabase: ", data);
				setDatabase(data);
			}
		};
		updateDatabase();
	}, []);

	return <main>{database && <MakeDatabaseCard {...{ database }} />}</main>;
};

export default Home;
