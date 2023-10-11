frappe.provide("frappe.views");
frappe.provide("frappe.request");
frappe.provide("frappe.request.error_handlers");

frappe.views.GanttView = class GanttView extends frappe.views.ListView {
	get view_name() {
		return "Gantt";
	}

	setup_defaults() {
		return super.setup_defaults().then(() => {
			this.page_title = this.page_title + " " + __("Gantt");
			this.calendar_settings = frappe.views.calendar[this.doctype] || {};

			if (typeof this.calendar_settings.gantt == "object") {
				Object.assign(this.calendar_settings, this.calendar_settings.gantt);
			}

			if (this.calendar_settings.order_by) {
				this.sort_by = this.calendar_settings.order_by;
				this.sort_order = "asc";
			} else {
				this.sort_by =
					this.view_user_settings.sort_by || this.calendar_settings.field_map.start;
				this.sort_order = this.view_user_settings.sort_order || "asc";
			}
		});
	}

	setup_view() { }

	prepare_data(data) {
		// super.prepare_data(data);

		const self = this;

		const $iframe = $("<iframe/>", {
			src: "http://rnd-gannt.dinord.ru",
			frameborder: '0',
			sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals'
		}).css({ width: '100%', height: '600px' });

		this.page.body.html($iframe).css({ padding: '1rem'})

		$iframe.on("load", function () {
			self.prepare_tasks_alt($(this));
		})

		// this.prepare_tasks();
	}

	async prepare_tasks_alt($iframe) {
		const contentWindow$ = $iframe[0].contentWindow;

		const payload = await $.post({
			url: '/api/method/frappe.desk.reportview.get',
			dataType: 'json',
			headers: {
				"X-Frappe-CSRF-Token": frappe.csrf_token,
			},
			data: {
				doctype: "Task",
				fields: '["`tabTask`.`name`","`tabTask`.`owner`","`tabTask`.`creation`","`tabTask`.`modified`","`tabTask`.`_user_tags`","`tabTask`.`_comments`","`tabTask`.`_assign`","`tabTask`.`_liked_by`","`tabTask`.`docstatus`","`tabTask`.`idx`","`tabTask`.`subject`","`tabTask`.`project`","`tabTask`.`type`","`tabTask`.`is_group`","`tabTask`.`status`","`tabTask`.`priority`","`tabTask`.`exp_end_date`","`tabTask`.`exp_start_date`","`tabTask`.`progress`","`tabTask`.`depends_on_tasks`","`tabTask`.`_seen`","`tabTask`.`color`"]',
				filters: [],
				start: 0,
				page_length: 999,
				view: 'List',
				group_by: "`tabTask`.`name`",
				with_comment_count: true
			}
		});

		console.log({ payload });
		contentWindow$.postMessage({
			type: 'e.tasks-loaded',
			payload,
		}, '*');
	}

	render() {
		this.load_lib.then(() => {
			// this.render_gantt();
		});
	}

	render_header() { }

	render_gantt() { }

	setup_view_mode_buttons() {
		// view modes (for translation) __("Day"), __("Week"), __("Month"),
		//__("Half Day"), __("Quarter Day")

		let $btn_group = this.$paging_area.find(".gantt-view-mode");
		if ($btn_group.length > 0) return;

		const view_modes = this.gantt.options.view_modes || [];
		const active_class = (view_mode) => (this.gantt.view_is(view_mode) ? "btn-info" : "");
		const html = `<div class="btn-group gantt-view-mode">
				${view_modes
				.map(
					(value) => `<button type="button"
						class="btn btn-default btn-sm btn-view-mode ${active_class(value)}"
						data-value="${value}">
						${__(value)}
					</button>`
				)
				.join("")}
			</div>`;

		this.$paging_area.find(".level-left").append(html);

		// change view mode asynchronously
		const change_view_mode = (value) =>
			setTimeout(() => this.gantt.change_view_mode(value), 0);

		this.$paging_area.on("click", ".btn-view-mode", (e) => {
			const $btn = $(e.currentTarget);
			this.$paging_area.find(".btn-view-mode").removeClass("btn-info");
			$btn.addClass("btn-info");

			const value = $btn.data().value;
			change_view_mode(value);
		});
	}

	set_colors() {
		const classes = this.tasks
			.map((t) => t.custom_class)
			.filter((c) => c && c.startsWith("color-"));

		let style = classes
			.map((c) => {
				const class_name = c.replace("#", "");
				const bar_color = "#" + c.substr(6);
				const progress_color = frappe.ui.color.get_contrast_color(bar_color);
				return `
				.gantt .bar-wrapper.${class_name} .bar {
					fill: ${bar_color};
				}
				.gantt .bar-wrapper.${class_name} .bar-progress {
					fill: ${progress_color};
				}
			`;
			})
			.join("");

		style = `<style>${style}</style>`;
		this.$result.prepend(style);
	}

	get_item(name) {
		return this.data.find((item) => item.name === name);
	}

	get required_libs() {
		return [
			"assets/frappe/node_modules/frappe-gantt/dist/frappe-gantt.css",
			"assets/frappe/node_modules/frappe-gantt/dist/frappe-gantt.min.js",
		];
	}
};
