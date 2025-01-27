class CloudObjectStoreContainerController < ApplicationController
  before_action :check_privileges
  before_action :get_session_data
  after_action :cleanup_action
  after_action :set_session_data

  include Mixins::GenericListMixin
  include Mixins::GenericShowMixin
  include Mixins::GenericSessionMixin
  include Mixins::GenericFormMixin
  include Mixins::BreadcrumbsMixin

  def breadcrumb_name(_model)
    _('Cloud Object Store Containers')
  end

  # handle buttons pressed on the button bar
  def button
    @edit = session[:edit] # Restore @edit for adv search box
    params[:page] = @current_page unless @current_page.nil? # Save current page for list refresh

    case params[:pressed]
    when "cloud_object_store_container_new"
      return javascript_redirect(:action => "new")
    when 'cloud_object_store_container_delete'
      delete_cloud_object_store_containers
    when "custom_button"
      custom_buttons
      return
    else
      process_cloud_object_storage_buttons(params[:pressed])
    end

    if params[:pressed].ends_with?("delete")
      delete_action
    else
      render_flash unless @flash_array.nil? || performed?
    end
  end

  def self.display_methods
    %w[cloud_object_store_objects custom_button_events]
  end

  def new
    assert_privileges("cloud_object_store_container_new")
    @in_a_form = true
    if params[:storage_manager_id]
      @storage_manager = find_record_with_rbac(ExtManagementSystem, params[:storage_manager_id])
    end
    @provider_regions = retrieve_provider_regions
    drop_breadcrumb(
      :name => _("Add New Cloud Object Store Container"),
      :url  => "/cloud_object_store_container/new"
    )
  end

  def create
    assert_privileges("cloud_object_store_container_new")
    case params[:button]
    when "cancel"
      javascript_redirect(previous_breadcrumb_url)
    when "add"
      options = form_params_create
      ext_management_system = options.delete(:ems)

      # Queue task
      task_id = CloudObjectStoreContainer.cloud_object_store_container_create_queue(
        session[:userid],
        ext_management_system,
        options
      )

      if task_id.kind_of?(Integer)
        initiate_wait_for_task(:task_id => task_id, :action => "create_finished")
      else
        add_flash(_("Cloud Object Store Container creation failed: Task start failed"), :error)
        javascript_flash(:spinner_off => true)
      end
    end
  end

  def create_finished
    task_id = session[:async][:params][:task_id]
    container_name = session[:async][:params][:name]
    task = MiqTask.find(task_id)
    if MiqTask.status_ok?(task.status)
      add_flash(_("Cloud Object Store Container \"%{name}\" created") % {
        :name => container_name
      })
    else
      add_flash(_("Unable to create Cloud Object Store Container \"%{name}\": %{details}") % {
        :name    => container_name,
        :details => task.message
      }, :error)
    end

    flash_to_session
    javascript_redirect(previous_breadcrumb_url)
  end

  def form_params_create
    options = {}
    options[:name] = params[:name] if params[:name]

    # Depending on the storage manager type, collect required form params.
    case params[:emstype]
    when "ManageIQ::Providers::Amazon::StorageManager::S3"
      if params[:provider_region]
        options[:create_bucket_configuration] = {
          :location_constraint => params[:provider_region]
        }
      end

      # Get the storage manager.
      storage_manager_id = params[:storage_manager_id] if params[:storage_manager_id]
      options[:ems] = find_record_with_rbac(ExtManagementSystem, storage_manager_id)
    end
    options
  end

  def download_data
    # TODO: rename to match others: cloud_object_store_container_view, write migration to update existing
    assert_privileges('cloudobject_store_container_view')
    super
  end

  def download_summary_pdf
    # TODO: rename to match others: cloud_object_store_container_view, write migration to update existing
    assert_privileges('cloudobject_store_container_view')
    super
  end

  private

  def record_class
    params[:pressed].starts_with?('cloud_object_store_object') ? CloudObjectStoreObject : CloudObjectStoreContainer
  end

  def retrieve_provider_regions
    managers = ManageIQ::Providers::CloudManager.permitted_subclasses.select(&:supports_regions?)
    managers.each_with_object({}) do |manager, provider_regions|
      regions = manager.module_parent::Regions.all.sort_by { |r| r[:description] }
      provider_regions[manager.name] = regions.map { |region| [region[:description], region[:name]] }
    end
  end

  def textual_group_list
    [%i[properties relationships], %i[tags]]
  end
  helper_method :textual_group_list

  def breadcrumbs_options
    {
      :breadcrumbs  => [
        {:title => _("Storage")},
        {:title => _("Object Store Containers"), :url => controller_url},
      ],
      :record_info  => @record,
      :record_title => :key,
    }.compact
  end

  def delete_cloud_object_store_containers
    assert_privileges("cloud_tenant_delete")
    containers = find_records_with_rbac(CloudObjectStoreContainer, checked_or_params)

    unless containers.empty?
      process_cloud_object_store_container(containers, "destroy")
    end
  end

  def process_cloud_object_store_container(containers, operation)
    return if containers.empty?

    if operation == "destroy"
      containers.each do |container|
        audit = {
          :event        => "cloud_object_store_container_record_delete_initiated",
          :message      => "[#{container.key}] Record delete initiated",
          :target_id    => container.id,
          :target_class => "CloudObjectStoreContainer",
          :userid       => session[:userid]
        }
        AuditEvent.success(audit)
        container.cloud_object_store_container_delete_queue(session[:userid])
      end
      add_flash(n_("Delete initiated for %{number} Cloud Object Store Container.",
                   "Delete initiated for %{number} Cloud Object Store Containers.",
                   containers.length) % {:number => containers.length})
    end
  end

  menu_section :ost

  feature_for_actions "#{controller_name}_show_list", *ADV_SEARCH_ACTIONS

  has_custom_buttons
end
