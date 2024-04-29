export function getAge() {
	const currentDate = new Date();
	const birth = new Date("2006-07-09");

	let age = currentDate.getFullYear() - birth.getFullYear();
	const monthDiff = currentDate.getMonth() - birth.getMonth();

	if (
		monthDiff < 0 ||
		(monthDiff === 0 && currentDate.getDate() < birth.getDate())
	) {
		age--;
	}

	return age;
}
